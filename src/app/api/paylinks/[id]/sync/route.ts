import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchPaymentStatus } from "@/lib/monei";
import { queuePaymentSuccessNotification } from "@/lib/notification-jobs";
import {
  applyPaymentUpdate,
  getPaylinkById,
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
      queuePaymentSuccessNotification(settings, updatedPaylink, payment);
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
