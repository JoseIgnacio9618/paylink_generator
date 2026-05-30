import { NextResponse } from "next/server";
import { sendPaymentSuccessNotification } from "@/lib/email";
import { paymentFromWebhook, verifyWebhookSignature } from "@/lib/monei";
import {
  applyPaymentUpdate,
  getPaylinkByMoneiPaymentId,
  markNotificationResult,
} from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const settings = getSettings();
  const signature = request.headers.get("MONEI-Signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing MONEI-Signature header." }, { status: 400 });
  }

  if (!verifyWebhookSignature(rawBody, signature, settings)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const payment = paymentFromWebhook(rawBody);
    const paylink = getPaylinkByMoneiPaymentId(payment.id);

    if (!paylink) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const updatedPaylink = applyPaymentUpdate(paylink.id, payment, "webhook");

    if (payment.status === "SUCCEEDED" && !updatedPaylink.notificationSentAt) {
      const notification = await sendPaymentSuccessNotification(
        settings,
        updatedPaylink,
        payment,
      );

      markNotificationResult(
        paylink.id,
        notification.sent
          ? notification
          : { error: notification.error, recipients: notification.recipients },
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing error.",
      },
      { status: 500 },
    );
  }
}
