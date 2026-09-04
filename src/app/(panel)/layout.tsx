import { AppShell } from "@/components/app-shell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireAuthenticatedUser();
  const settings = await getSettings();

  return (
    <AppShell appName={settings.appName} currentUser={currentUser}>
      {children}
    </AppShell>
  );
}
