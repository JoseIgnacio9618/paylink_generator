import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPaylinkForOwner, PaylinkCreationError } from "@/lib/paylink-creation";
import { getSettings } from "@/lib/settings";
import { trimToEmpty } from "@/lib/utils";
import { createPaylinkInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

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

    const result = await createPaylinkForOwner(getSettings(), {
      ownerUserId: currentUser.id,
      title: parsed.data.title,
      description: parsed.data.description,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      recipientEmail: trimToEmpty(parsed.data.recipientEmail),
      customerName: trimToEmpty(parsed.data.customerName),
      customerEmail: trimToEmpty(parsed.data.customerEmail),
      customerPhone: trimToEmpty(parsed.data.customerPhone),
      allowedPaymentMethods: parsed.data.allowedPaymentMethods,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo crear el link de pago.",
      },
      { status: error instanceof PaylinkCreationError ? error.status : 500 },
    );
  }
}
