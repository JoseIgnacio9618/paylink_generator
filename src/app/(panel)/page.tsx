import { OverviewPage } from "@/components/overview-page";
import { listPaylinks } from "@/lib/paylinks";
import { getConfigurationWarnings, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const settings = getSettings();
  const paylinks = listPaylinks();
  const warnings = getConfigurationWarnings(settings);

  return <OverviewPage settings={settings} paylinks={paylinks} warnings={warnings} />;
}
