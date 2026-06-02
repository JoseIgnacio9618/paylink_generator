import { OverviewPage } from "@/components/overview-page";
import { requireAuthenticatedUser } from "@/lib/auth";
import { listPaylinks } from "@/lib/paylinks";
import { getConfigurationWarnings, getSettings } from "@/lib/settings";
import { getVisiblePaylinkOwnerIds } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await requireAuthenticatedUser();
  const settings = getSettings();
  const paylinks = listPaylinks({ ownerUserIds: getVisiblePaylinkOwnerIds(currentUser) });
  const warnings =
    currentUser.role === "superadmin" ? getConfigurationWarnings(settings) : [];

  return (
    <OverviewPage
      paylinks={paylinks}
      warnings={warnings}
    />
  );
}
