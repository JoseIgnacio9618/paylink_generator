import { NextResponse } from "next/server";
import { syncMerchantDisplayName } from "@/lib/monei";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const currentSettings = getSettings();
    const body = await request.json();
    const parsed = settingsInputSchema.safeParse({
      ...body,
      defaultCurrency: String(body.defaultCurrency ?? "").toUpperCase(),
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

    const settings = updateSettings(parsed.data);
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
