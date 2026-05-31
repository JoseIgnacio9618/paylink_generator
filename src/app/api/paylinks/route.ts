import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createHostedPayment, getCheckoutSnapshot } from "@/lib/monei";
import { insertPaylink } from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";
import {
  amountToCents,
  formatCurrency,
  formatPaymentMethodLabel,
  formatPaymentMethodList,
  generateOrderId,
  trimToEmpty,
} from "@/lib/utils";
import { createPaylinkInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

const CARD_LIMIT_FAILURE_MESSAGE =
  "Payments with card are only available for amounts below 4000.00.";

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

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPaylinkInputSchema.safeParse({
      ...body,
      currency: String(body.currency ?? "").toUpperCase(),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const amountCents = amountToCents(parsed.data.amount);

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser un importe válido con hasta 2 decimales." },
        { status: 400 },
      );
    }

    const settings = getSettings();
    const localPaylinkId = randomUUID();
    const orderId = generateOrderId();
    const requestedPaymentMethods = parsed.data.allowedPaymentMethods;
    let cardLimitTriggered = false;
    let fallbackPaymentMethodsUsed: string[] | null = null;

    let payment = await createHostedPayment(settings, {
      localPaylinkId,
      orderId,
      title: parsed.data.title,
      description: parsed.data.description,
      amountCents,
      currency: parsed.data.currency,
      customerName: trimToEmpty(parsed.data.customerName),
      customerEmail: trimToEmpty(parsed.data.customerEmail),
      customerPhone: trimToEmpty(parsed.data.customerPhone),
      allowedPaymentMethods: requestedPaymentMethods,
    });

    if (payment.status === "FAILED") {
      const snapshotForRetry = await getCheckoutSnapshot(settings, {
        amountCents,
        currency: parsed.data.currency,
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
          title: parsed.data.title,
          description: parsed.data.description,
          amountCents,
          currency: parsed.data.currency,
          customerName: trimToEmpty(parsed.data.customerName),
          customerEmail: trimToEmpty(parsed.data.customerEmail),
          customerPhone: trimToEmpty(parsed.data.customerPhone),
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

      return NextResponse.json(
        {
          error:
            cardOnlyFailure
              ? "MONEI no permite pagos solo con tarjeta por encima de 4.000,00. Añade otro método como Bizum o PayPal para que la app pueda crear el checkout sin tarjeta."
              : isCardAmountLimitFailure(payment.statusMessage)
                ? `MONEI ha devuelto un límite de tarjeta al crear este checkout. La app estaba intentando crear el pago con ${formatPaymentMethodList(effectiveRequestedMethods)}.`
                : payment.statusMessage ??
                  "MONEI no ha podido preparar el checkout con la configuración solicitada.",
        },
        { status: 400 },
      );
    }

    const checkoutSnapshot = await getCheckoutSnapshot(settings, {
      paymentId: payment.id,
      amountCents,
      currency: parsed.data.currency,
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
          currency: parsed.data.currency,
          availablePaymentMethods: resolvedPaymentMethods,
          countryCode: checkoutSnapshot?.countryCode ?? "",
          cardLimitTriggered,
        }),
      }));

    const paylink = insertPaylink({
      id: localPaylinkId,
      ownerUserId: currentUser.id,
      orderId,
      title: parsed.data.title,
      description: parsed.data.description,
      amountCents,
      currency: parsed.data.currency,
      recipientEmail: trimToEmpty(parsed.data.recipientEmail),
      customerName: trimToEmpty(parsed.data.customerName),
      customerEmail: trimToEmpty(parsed.data.customerEmail),
      customerPhone: trimToEmpty(parsed.data.customerPhone),
      allowedPaymentMethods: resolvedPaymentMethods,
      payment,
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo crear el link de pago.",
      },
      { status: 500 },
    );
  }
}
