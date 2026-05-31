import { CreatePaylinkForm } from "@/components/create-paylink-form";
import { PageFrame } from "@/components/panel-ui";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getCheckoutSnapshot } from "@/lib/monei";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function NewPaylinkPage() {
  await requireAuthenticatedUser();
  const settings = getSettings();
  const accountSnapshot = settings.moneiApiKey
    ? await getCheckoutSnapshot(settings).catch(() => null)
    : null;

  return (
    <PageFrame
      eyebrow="Nuevo link"
      title="Crear un link de pago"
      description="Prepara un checkout hosted de MONEI para un producto o servicio y guarda el seguimiento del cobro dentro de tu propio espacio de usuario."
    >
      <CreatePaylinkForm settings={settings} accountSnapshot={accountSnapshot} />
    </PageFrame>
  );
}
