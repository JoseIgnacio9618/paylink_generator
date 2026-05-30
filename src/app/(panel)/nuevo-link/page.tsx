import { CreatePaylinkForm } from "@/components/create-paylink-form";
import { PageFrame } from "@/components/panel-ui";
import { getCheckoutSnapshot } from "@/lib/monei";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function NewPaylinkPage() {
  const settings = getSettings();
  const accountSnapshot = settings.moneiApiKey
    ? await getCheckoutSnapshot(settings).catch(() => null)
    : null;

  return (
    <PageFrame
      eyebrow="Nuevo link"
      title="Crear un link de pago"
      description="Prepara un checkout hosted de MONEI para un producto o servicio y guarda el control completo del estado en tu propia base de datos."
    >
      <CreatePaylinkForm settings={settings} accountSnapshot={accountSnapshot} />
    </PageFrame>
  );
}
