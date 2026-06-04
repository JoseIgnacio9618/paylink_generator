import { randomUUID } from "node:crypto";
import { createHostedPayment, getCheckoutSnapshot } from "@/lib/monei";
import { insertPaylink } from "@/lib/paylinks";
import type { PaylinkRecord, SettingsRecord } from "@/lib/types";
import {
  amountToCents,
  formatCurrency,
  formatPaymentMethodLabel,
  formatPaymentMethodList,
  generateOrderId,
  trimToEmpty,
} from "@/lib/utils";

const CARD_LIMIT_FAILURE_MESSAGE =
  "Payments with card are only available for amounts below 4000.00.";

export class PaylinkCreationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "PaylinkCreationError";
  }
}

function isCardAmountLimitFailure(statusMessage: string | undefined) {
  return statusMessage?.includes(CARD_LIMIT_FAILURE_MESSAGE) ?? false;
}

function sameMethods(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((method, index) => method === right[index]);
}

function buildOmittedMethodReason(input: {
  method: string;
  amountCents: number;
  currency: string;
  availablePaymentMethods: string[];
  countryCode: string;
  cardLimitTriggered?: boolean;
}) {
  const formattedAmount = formatCurrency(input.amountCents, input.currency);
  const methodLabel = formatPaymentMethodLabel(input.method);

  if (input.method === "card" && input.cardLimitTriggered) {
    return `${methodLabel} no se ha podido usar porque MONEI solo permite tarjeta por debajo de 4.000,00 para este tipo de checkout. El link se ha rehecho automáticamente con el resto de métodos seleccionados.`;
  }

  if (input.availablePaymentMethods.length === 0) {
    return `${methodLabel} no quedó disponible en el checkout final de MONEI para ${formattedAmount}. Revisa la configuración activa de la cuenta, la moneda y las restricciones del método.`;
  }

  const availableLabel = formatPaymentMethodList(input.availablePaymentMethods);
  const countrySuffix = input.countryCode ? ` y país ${input.countryCode}` : "";

  return `${methodLabel} no quedó disponible en el checkout final de MONEI para ${formattedAmount}${countrySuffix}. MONEI solo dejó ${availableLabel} para este pago.`;
}

export type CreatePaylinkFromInput = {
  ownerUserId: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  recipientEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  allowedPaymentMethods: string[];
};

export type CreatedPaylinkResult = {
  paylink: PaylinkRecord;
  creationSummary: {
    requestedPaymentMethods: string[];
    availablePaymentMethods: string[];
    omittedPaymentMethods: Array<{
      method: string;
      reason: string;
    }>;
    historyHref: string;
    message: string;
  };
  warning: string | null;
};

export async function createPaylinkForOwner(
  settings: SettingsRecord,
  input: CreatePaylinkFromInput,
): Promise<CreatedPaylinkResult> {
  const amountCents = amountToCents(input.amount);
  const currency = "EUR";

  if (!amountCents || amountCents <= 0) {
    throw new PaylinkCreationError(
      "El precio debe ser un importe válido con hasta 2 decimales.",
    );
  }

  const localPaylinkId = randomUUID();
  const orderId = generateOrderId();
  const requestedPaymentMethods = input.allowedPaymentMethods;
  let cardLimitTriggered = false;
  let fallbackPaymentMethodsUsed: string[] | null = null;

  let payment = await createHostedPayment(settings, {
    localPaylinkId,
    orderId,
    title: input.title,
    description: input.description,
    amountCents,
    currency,
    customerName: trimToEmpty(input.customerName),
    customerEmail: trimToEmpty(input.customerEmail),
    customerPhone: trimToEmpty(input.customerPhone),
    allowedPaymentMethods: requestedPaymentMethods,
  });

  if (payment.status === "FAILED") {
    const snapshotForRetry = await getCheckoutSnapshot(settings, {
      amountCents,
      currency,
    }).catch(() => null);
    const fallbackPaymentMethods = (
      snapshotForRetry
        ? requestedPaymentMethods.filter((method) =>
            snapshotForRetry.paymentMethods.includes(method),
          )
        : requestedPaymentMethods.filter((method) => method !== "card")
    ).filter(Boolean);

    if (
      isCardAmountLimitFailure(payment.statusMessage) &&
      fallbackPaymentMethods.length > 0 &&
      !sameMethods(fallbackPaymentMethods, requestedPaymentMethods)
    ) {
      cardLimitTriggered =
        requestedPaymentMethods.includes("card") && !fallbackPaymentMethods.includes("card");
      fallbackPaymentMethodsUsed = fallbackPaymentMethods;
      payment = await createHostedPayment(settings, {
        localPaylinkId,
        orderId,
        title: input.title,
        description: input.description,
        amountCents,
        currency,
        customerName: trimToEmpty(input.customerName),
        customerEmail: trimToEmpty(input.customerEmail),
        customerPhone: trimToEmpty(input.customerPhone),
        allowedPaymentMethods: fallbackPaymentMethodsUsed,
      });
    }
  }

  if (payment.status === "FAILED") {
    const effectiveRequestedMethods = fallbackPaymentMethodsUsed ?? requestedPaymentMethods;
    const fallbackPaymentMethods = effectiveRequestedMethods.filter((method) => method !== "card");
    const cardOnlyFailure =
      isCardAmountLimitFailure(payment.statusMessage) &&
      effectiveRequestedMethods.includes("card") &&
      fallbackPaymentMethods.length === 0;

    throw new PaylinkCreationError(
      cardOnlyFailure
        ? "MONEI no permite pagos solo con tarjeta por encima de 4.000,00. Añade otro método como Bizum o PayPal para que la app pueda crear el checkout sin tarjeta."
        : isCardAmountLimitFailure(payment.statusMessage)
          ? `MONEI ha devuelto un límite de tarjeta al crear este checkout. La app estaba intentando crear el pago con ${formatPaymentMethodList(effectiveRequestedMethods)}.`
          : payment.statusMessage ??
            "MONEI no ha podido preparar el checkout con la configuración solicitada.",
    );
  }

  const checkoutSnapshot = await getCheckoutSnapshot(settings, {
    paymentId: payment.id,
    amountCents,
    currency,
  }).catch(() => null);
  const resolvedPaymentMethods = checkoutSnapshot?.paymentMethods ?? requestedPaymentMethods;
  const resolvedPaymentMethodLabel =
    resolvedPaymentMethods.length > 0
      ? formatPaymentMethodList(resolvedPaymentMethods)
      : "ningún método";
  const omittedPaymentMethods = requestedPaymentMethods
    .filter((method) => !resolvedPaymentMethods.includes(method))
    .map((method) => ({
      method,
      reason: buildOmittedMethodReason({
        method,
        amountCents,
        currency,
        availablePaymentMethods: resolvedPaymentMethods,
        countryCode: checkoutSnapshot?.countryCode ?? "",
        cardLimitTriggered,
      }),
    }));

  const paylink = insertPaylink({
    id: localPaylinkId,
    ownerUserId: input.ownerUserId,
    orderId,
    title: input.title,
    description: input.description,
    amountCents,
    currency,
    recipientEmail: trimToEmpty(input.recipientEmail),
    customerName: trimToEmpty(input.customerName),
    customerEmail: trimToEmpty(input.customerEmail),
    customerPhone: trimToEmpty(input.customerPhone),
    allowedPaymentMethods: resolvedPaymentMethods,
    payment,
  });

  return {
    paylink,
    creationSummary: {
      requestedPaymentMethods,
      availablePaymentMethods: resolvedPaymentMethods,
      omittedPaymentMethods,
      historyHref: "/historial",
      message:
        omittedPaymentMethods.length > 0
          ? cardLimitTriggered
            ? `El link se ha creado, pero MONEI ha quitado tarjeta por el límite de importe y ha dejado disponibles ${resolvedPaymentMethodLabel}.`
            : `El link se ha creado, pero MONEI ha dejado disponibles ${resolvedPaymentMethodLabel} para este checkout.`
          : "El link de pago se ha creado correctamente con todos los métodos elegidos.",
    },
    warning:
      omittedPaymentMethods.length > 0
        ? `MONEI ha preparado el checkout con ${resolvedPaymentMethodLabel}. Se han omitido ${formatPaymentMethodList(omittedPaymentMethods.map((item) => item.method))} en el checkout final.`
        : null,
  };
}
