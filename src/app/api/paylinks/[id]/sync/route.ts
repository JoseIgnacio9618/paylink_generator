import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPaymentSuccessNotification } from "@/lib/email";
import { fetchPaymentStatus } from "@/lib/monei";
import {
  applyPaymentUpdate,
  getPaylinkById,
  markNotificationResult,
} from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";
import { getVisiblePaylinkOwnerIds } from "@/lib/users";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, context: { params: Params }) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const { id } = await context.params;
    const paylink = getPaylinkById(id, getVisiblePaylinkOwnerIds(currentUser));

    if (!paylink) {
      return NextResponse.json({ error: "Paylink no encontrado." }, { status: 404 });
    }

    const settings = getSettings();
    const payment = await fetchPaymentStatus(settings, paylink.moneiPaymentId);
    const updatedPaylink = applyPaymentUpdate(id, payment, "manual_sync");

    if (payment.status === "SUCCEEDED" && !updatedPaylink.notificationSentAt) {
      const notification = await sendPaymentSuccessNotification(
        settings,
        updatedPaylink,
        payment,
      );

      markNotificationResult(
        id,
        notification.sent
          ? notification
          : { error: notification.error, recipients: notification.recipients },
      );
    }

    return NextResponse.json({
      paylink: getPaylinkById(id, getVisiblePaylinkOwnerIds(currentUser)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo sincronizar el estado del pago.",
      },
      { status: 500 },
    );
  }
}
