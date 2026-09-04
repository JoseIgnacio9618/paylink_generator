import { CreatePaylinkForm } from "@/components/create-paylink-form";
import { PageFrame } from "@/components/panel-ui";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getCheckoutSnapshot } from "@/lib/monei";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function NewPaylinkPage() {
  await requireAuthenticatedUser();
  const settings = await getSettings();
  const accountSnapshot = settings.moneiApiKey
    ? await getCheckoutSnapshot(settings).catch(() => null)
    : null;

  return (
    <PageFrame
      eyebrow="Nuevo link"
      title="Crear un link de pago"
      description="Crea un cobro nuevo y déjalo listo para seguimiento."
      headerMode="none"
    >
      <CreatePaylinkForm settings={settings} accountSnapshot={accountSnapshot} />
    </PageFrame>
  );
}
