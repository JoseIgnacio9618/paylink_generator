import { requireSuperadminUser } from "@/lib/auth";
import { PageFrame } from "@/components/panel-ui";
import { SettingsForm } from "@/components/settings-form";
import { getCheckoutSnapshot } from "@/lib/monei";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireSuperadminUser();
  const settings = await getSettings();
  const accountSnapshot = settings.moneiApiKey
    ? await getCheckoutSnapshot(settings).catch(() => null)
    : null;

  return (
    <PageFrame
      eyebrow="Configuración"
      title="Ajustes de integración"
      description="Gestiona MONEI, SMTP, moneda, redirects y plantillas."
      headerMode="none"
    >
      <SettingsForm settings={settings} accountSnapshot={accountSnapshot} />
    </PageFrame>
  );
}
