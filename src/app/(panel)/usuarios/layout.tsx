import { PageFrame } from "@/components/panel-ui";
import { UsersSectionNav } from "@/components/users-section-nav";
import { requireSuperadminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UsersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSuperadminUser();

  return (
    <PageFrame
      eyebrow="Usuarios"
      title="Gestión de usuarios"
      description="Empieza revisando los usuarios existentes y salta desde ahí a la creación de nuevas cuentas cuando lo necesites. Desde esta área controlas quién puede entrar, qué rol tiene cada cuenta y si un usuario puede ver solo sus pagos o todos los de la plataforma."
    >
      <UsersSectionNav />
      {children}
    </PageFrame>
  );
}
