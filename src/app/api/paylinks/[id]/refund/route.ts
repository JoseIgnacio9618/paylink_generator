import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyPaymentUpdate, getPaylinkById } from "@/lib/paylinks";
import { fetchPaymentStatus, refundPayment } from "@/lib/monei";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

const REFUNDABLE_STATUSES = new Set(["SUCCEEDED", "PARTIALLY_REFUNDED"]);

function getRefundableAmount(payment: { amount?: number; refundedAmount?: number }) {
  const amount = payment.amount ?? 0;
  const refundedAmount = payment.refundedAmount ?? 0;
  return Math.max(0, amount - refundedAmount);
}

export async function POST(_request: Request, context: { params: Params }) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    if (currentUser.role !== "superadmin") {
      return NextResponse.json(
        { error: "Solo el superadministrador puede gestionar reembolsos." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const paylink = getPaylinkById(id);

    if (!paylink) {
      return NextResponse.json({ error: "Paylink no encontrado." }, { status: 404 });
    }

    const settings = getSettings();
    const payment = await fetchPaymentStatus(settings, paylink.moneiPaymentId);

    if (!REFUNDABLE_STATUSES.has(payment.status ?? "")) {
      return NextResponse.json(
        {
          error:
            payment.status === "REFUNDED"
              ? "Este pago ya está completamente reembolsado."
              : "Este pago no admite reembolso desde su estado actual.",
        },
        { status: 400 },
      );
    }

    const refundableAmount = getRefundableAmount(payment);

    if (refundableAmount <= 0) {
      return NextResponse.json(
        { error: "No queda importe pendiente por reembolsar." },
        { status: 400 },
      );
    }

    const refundedPayment = await refundPayment(settings, paylink.moneiPaymentId, {
      amount: refundableAmount,
      refundReason: "requested_by_customer",
    });

    const updatedPaylink = applyPaymentUpdate(id, refundedPayment, "manual_refund");

    console.info("Manual refund applied.", {
      paylinkId: paylink.id,
      paymentId: paylink.moneiPaymentId,
      refundedAmount: refundableAmount,
      status: refundedPayment.status,
    });

    return NextResponse.json({
      paylink: updatedPaylink,
      refundedAmount: refundableAmount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo tramitar el reembolso.",
      },
      { status: 500 },
    );
  }
}
