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
    <PageFrame headerMode="none">
      <UsersSectionNav />
      {children}
    </PageFrame>
  );
}
