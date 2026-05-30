import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createHostedPayment, getCheckoutSnapshot } from "@/lib/monei";
import { insertPaylink } from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";
import {
  amountToCents,
  formatPaymentMethodList,
  generateOrderId,
  trimToEmpty,
} from "@/lib/utils";
import { createPaylinkInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
    const checkoutSnapshot = await getCheckoutSnapshot(settings, {
      amountCents,
      currency: parsed.data.currency,
    });
    const resolvedPaymentMethods = parsed.data.allowedPaymentMethods.filter((method) =>
      checkoutSnapshot.paymentMethods.includes(method),
    );

    if (resolvedPaymentMethods.length === 0) {
      const availableMessage =
        checkoutSnapshot.paymentMethods.length > 0
          ? `Métodos activos ahora mismo en tu cuenta: ${formatPaymentMethodList(checkoutSnapshot.paymentMethods)}.`
          : "Tu cuenta MONEI no tiene métodos de pago compatibles activos para este checkout.";

      return NextResponse.json(
        {
          error: `Los métodos elegidos no están disponibles en MONEI para este pago. ${availableMessage}`,
        },
        { status: 400 },
      );
    }

    const payment = await createHostedPayment(settings, {
      localPaylinkId,
      orderId,
      title: parsed.data.title,
      description: parsed.data.description,
      amountCents,
      currency: parsed.data.currency,
      customerName: trimToEmpty(parsed.data.customerName),
      customerEmail: trimToEmpty(parsed.data.customerEmail),
      customerPhone: trimToEmpty(parsed.data.customerPhone),
      allowedPaymentMethods: resolvedPaymentMethods,
    });

    if (payment.status === "FAILED") {
      return NextResponse.json(
        {
          error:
            payment.statusMessage ??
            "MONEI no ha podido preparar el checkout con la configuración solicitada.",
        },
        { status: 400 },
      );
    }

    const paylink = insertPaylink({
      id: localPaylinkId,
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

    const omittedPaymentMethods = parsed.data.allowedPaymentMethods.filter(
      (method) => !resolvedPaymentMethods.includes(method),
    );

    return NextResponse.json({
      paylink,
      warning:
        omittedPaymentMethods.length > 0
          ? `MONEI ha preparado el checkout con ${formatPaymentMethodList(resolvedPaymentMethods)}. Se han omitido ${formatPaymentMethodList(omittedPaymentMethods)} porque no están activos en tu cuenta.`
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
