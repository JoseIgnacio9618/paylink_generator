import type { CreatePaymentRequest, Payment } from "@monei-js/node-sdk";
import { Monei } from "@monei-js/node-sdk";
import type { MoneiCheckoutSnapshot, SettingsRecord } from "@/lib/types";
import { filterSupportedPaymentMethods, toAbsoluteUrl } from "@/lib/utils";

function getClient(
  settings: SettingsRecord,
  options?: {
    withAccountId?: boolean;
  },
) {
  if (!settings.moneiApiKey) {
    throw new Error("Falta la API key de MONEI en la configuración.");
  }

  const client = new Monei(settings.moneiApiKey, {
    userAgent: "paylink-generator/0.1",
  });

  // Only send account ID on explicit on-behalf-of merchant operations.
  if (options?.withAccountId && settings.moneiAccountId) {
    client.setAccountId(settings.moneiAccountId);
  }

  return client;
}

function buildHostedUrl(settings: SettingsRecord, configuredUrl: string, fallbackSuffix: string) {
  if (configuredUrl) {
    return toAbsoluteUrl(settings.baseUrl, configuredUrl);
  }

  if (!settings.baseUrl) {
    return "";
  }

  return `${settings.baseUrl.replace(/\/$/, "")}/result?status=${fallbackSuffix}`;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  settings: SettingsRecord,
) {
  const client = getClient(settings);
  return client.verifySignature(rawBody, signature);
}

export async function createHostedPayment(
  settings: SettingsRecord,
  input: {
    localPaylinkId: string;
    orderId: string;
    title: string;
    description: string;
    amountCents: number;
    currency: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    allowedPaymentMethods: string[];
  },
) {
  if (!settings.baseUrl) {
    throw new Error("Debes configurar `Base URL` antes de crear links de pago.");
  }

  const callbackUrl = toAbsoluteUrl(settings.baseUrl, settings.callbackPath);
  const request: CreatePaymentRequest = {
    amount: input.amountCents,
    currency: input.currency,
    orderId: input.orderId,
    description: input.description
      ? `${input.title} — ${input.description}`
      : input.title,
    callbackUrl,
    completeUrl: buildHostedUrl(settings, settings.completeUrl, "complete"),
    failUrl: buildHostedUrl(settings, settings.failUrl, "failed"),
    cancelUrl: buildHostedUrl(settings, settings.cancelUrl, "cancelled"),
    allowedPaymentMethods: input.allowedPaymentMethods,
    autoRecover: true,
    metadata: {
      localPaylinkId: input.localPaylinkId,
      title: input.title,
    },
  };

  if (input.customerEmail || input.customerName || input.customerPhone) {
    request.customer = {
      email: input.customerEmail || undefined,
      name: input.customerName || undefined,
      phone: input.customerPhone || undefined,
    };
  }

  return getClient(settings).payments.create(request);
}

export async function fetchPaymentStatus(settings: SettingsRecord, paymentId: string) {
  return getClient(settings).payments.get(paymentId);
}

export async function getCheckoutSnapshot(
  settings: SettingsRecord,
  input?: {
    paymentId?: string;
    amountCents?: number;
    currency?: string;
    countryCode?: string;
  },
): Promise<MoneiCheckoutSnapshot> {
  const amountCents = input?.amountCents ?? 100;
  const currency = input?.currency ?? settings.defaultCurrency ?? "EUR";
  const response = input?.paymentId
    ? await getClient(settings).paymentMethods.getAllowed(input.paymentId)
    : await getClient(settings).paymentMethods.getAllowed(
        undefined,
        amountCents,
        currency,
        input?.countryCode,
      );

  return {
    accountId: response.accountId ?? settings.moneiAccountId ?? "",
    merchantName: response.merchantName ?? "",
    countryCode: response.countryCode ?? "",
    currency: response.currency ?? currency,
    paymentMethods: filterSupportedPaymentMethods(response.paymentMethods ?? []),
  };
}

export async function syncMerchantDisplayName(settings: Pick<SettingsRecord, "moneiApiKey" | "merchantDisplayName">) {
  if (!settings.moneiApiKey || !settings.merchantDisplayName.trim()) {
    return null;
  }

  const response = await fetch("https://graphql.monei.com/", {
    method: "POST",
    headers: {
      Authorization: settings.moneiApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation UpdateAccount($input: UpdateAccountInput!) {
          updateAccount(input: $input) {
            id
            publicBusinessDetails {
              companyName
            }
          }
        }
      `,
      variables: {
        input: {
          publicBusinessDetails: {
            companyName: settings.merchantDisplayName,
          },
        },
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    data?: {
      updateAccount?: {
        id?: string;
        publicBusinessDetails?: {
          companyName?: string | null;
        } | null;
      } | null;
    };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.[0]?.message ??
        "No se pudo sincronizar el nombre del comercio con la cuenta de MONEI.",
    );
  }

  return payload.data?.updateAccount ?? null;
}

export function paymentFromWebhook(rawBody: string) {
  return JSON.parse(rawBody) as Payment;
}
