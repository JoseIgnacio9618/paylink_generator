import { PageFrame } from "@/components/panel-ui";
import { SettingsForm } from "@/components/settings-form";
import { getCheckoutSnapshot } from "@/lib/monei";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = getSettings();
  const accountSnapshot = settings.moneiApiKey
    ? await getCheckoutSnapshot(settings).catch(() => null)
    : null;

  return (
    <PageFrame
      eyebrow="Configuración"
      title="Ajustes de integración"
      description="Edita MONEI, SMTP, moneda, redirects y plantillas desde una pantalla dedicada en lugar de mezclarlo con la operativa diaria."
    >
      <SettingsForm settings={settings} accountSnapshot={accountSnapshot} />
    </PageFrame>
  );
}
