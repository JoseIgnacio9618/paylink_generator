import { NextResponse } from "next/server";
import { paymentFromWebhook, verifyWebhookSignature } from "@/lib/monei";
import { processPendingNotificationJobs, queuePaymentSuccessNotification } from "@/lib/notification-jobs";
import {
  applyPaymentUpdate,
  getPaylinkByMoneiPaymentId,
} from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const rawBody = await request.text();
  const settings = await getSettings();
  const signature = request.headers.get("MONEI-Signature");

  if (!signature) {
    console.warn("MONEI webhook rejected: missing signature header.");
    return NextResponse.json({ error: "Missing MONEI-Signature header." }, { status: 400 });
  }

  if (!verifyWebhookSignature(rawBody, signature, settings)) {
    console.warn("MONEI webhook rejected: invalid signature.", {
      hasApiKey: Boolean(settings.moneiApiKey),
      bodyLength: rawBody.length,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const payment = paymentFromWebhook(rawBody);
    const paylink = await getPaylinkByMoneiPaymentId(payment.id);

    if (!paylink) {
      console.info("MONEI webhook ignored: payment not found.", {
        paymentId: payment.id,
        status: payment.status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ received: true, ignored: true });
    }

    const updatedPaylink = await applyPaymentUpdate(paylink.id, payment, "webhook");
    console.info("MONEI webhook applied.", {
      paymentId: payment.id,
      paylinkId: paylink.id,
      status: payment.status,
      notificationAlreadySent: Boolean(updatedPaylink.notificationSentAt),
      durationMs: Date.now() - startedAt,
    });

    if (payment.status === "SUCCEEDED" && !updatedPaylink.notificationSentAt) {
      await queuePaymentSuccessNotification(settings, updatedPaylink, payment);
      await processPendingNotificationJobs();
      console.info("MONEI webhook email queued.", {
        paymentId: payment.id,
        paylinkId: paylink.id,
      });
    }

    console.info("MONEI webhook acknowledged.", {
      paymentId: payment.id,
      paylinkId: paylink.id,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("MONEI webhook processing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing error.",
      },
      { status: 500 },
    );
  }
}
