import { requireAuthenticatedUser } from "@/lib/auth";
import { PageFrame } from "@/components/panel-ui";
import { PaylinksTable } from "@/components/paylinks-table";
import { searchPaylinks } from "@/lib/paylinks";
import { getPaylinkScopeDescription, getVisiblePaylinkOwnerIds } from "@/lib/users";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const currentUser = await requireAuthenticatedUser();
  const params = await searchParams;
  const visibleOwnerUserIds = getVisiblePaylinkOwnerIds(currentUser);
  const paylinks = searchPaylinks({
    query: params.q,
    page: Number(params.page ?? "1"),
    pageSize: Number(params.pageSize ?? "25"),
    ownerUserIds: visibleOwnerUserIds,
  });

  return (
    <PageFrame
      eyebrow="Historial"
      title="Estado de los cobros"
      description={`${getPaylinkScopeDescription(currentUser)} Puedes abrir, copiar y sincronizar pagos desde aquí.`}
      headerMode="none"
    >
      <PaylinksTable paylinks={paylinks} />
    </PageFrame>
  );
}
