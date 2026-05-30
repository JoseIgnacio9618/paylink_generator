import { AppShell } from "@/components/app-shell";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = getSettings();

  return <AppShell appName={settings.appName}>{children}</AppShell>;
}
