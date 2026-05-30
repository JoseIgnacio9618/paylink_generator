import { PageFrame } from "@/components/panel-ui";
import { PaylinksTable } from "@/components/paylinks-table";
import { searchPaylinks } from "@/lib/paylinks";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const paylinks = searchPaylinks({
    query: params.q,
    page: Number(params.page ?? "1"),
    pageSize: Number(params.pageSize ?? "25"),
  });

  return (
    <PageFrame
      eyebrow="Historial"
      title="Estado de los cobros"
      description="Consulta todos los links creados, copia el checkout, abre el pago y sincroniza manualmente cualquier transaccion con MONEI."
    >
      <PaylinksTable paylinks={paylinks} />
    </PageFrame>
  );
}
