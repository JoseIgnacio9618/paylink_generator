import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPaylinkForOwner, PaylinkCreationError } from "@/lib/paylink-creation";
import { canRecreatePaylink } from "@/lib/paylink-checkout";
import { getPaylinkById } from "@/lib/paylinks";
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

    if (!canRecreatePaylink(paylink)) {
      return NextResponse.json(
        {
          error:
            paylink.moneiStatus === "SUCCEEDED"
              ? "Este pago ya se ha completado y no se debe recrear desde aquí."
              : "Este paylink todavía tiene un checkout reutilizable. Abre o comparte el checkout actual antes de recrearlo.",
        },
        { status: 400 },
      );
    }

    const result = await createPaylinkForOwner(getSettings(), {
      ownerUserId: paylink.ownerUserId,
      title: paylink.title,
      description: paylink.description,
      amount: String(paylink.amountCents / 100),
      currency: "EUR",
      recipientEmail: paylink.recipientEmail,
      customerName: paylink.customerName,
      customerEmail: paylink.customerEmail,
      customerPhone: paylink.customerPhone,
      allowedPaymentMethods: paylink.allowedPaymentMethods,
    });

    return NextResponse.json({
      ...result,
      recreatedFromPaylinkId: paylink.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo recrear el link de pago.",
      },
      { status: error instanceof PaylinkCreationError ? error.status : 500 },
    );
  }
}
