import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncMerchantDisplayName } from "@/lib/monei";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    if (currentUser.role !== "superadmin") {
      return NextResponse.json(
        { error: "Solo el superadministrador puede modificar la configuración." },
        { status: 403 },
      );
    }

    const currentSettings = await getSettings();
    const body = await request.json();
    const parsed = settingsInputSchema.safeParse({
      ...body,
      defaultCurrency: "EUR",
      smtpPort: Number(body.smtpPort ?? 0),
      smtpSecure: Boolean(body.smtpSecure),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Configuración inválida." },
        { status: 400 },
      );
    }

    if (
      parsed.data.moneiApiKey &&
      (currentSettings.merchantDisplayName !== parsed.data.merchantDisplayName ||
        currentSettings.moneiApiKey !== parsed.data.moneiApiKey)
    ) {
      await syncMerchantDisplayName(parsed.data);
    }

    const settings = await updateSettings(parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar la configuración.",
      },
      { status: 500 },
    );
  }
}
