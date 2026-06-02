import { PageFrame, SectionCard, SectionHeading, SummaryCard } from "@/components/panel-ui";
import { getPaylinkStats } from "@/lib/stats";
import type { PaylinkRecord } from "@/lib/types";

export function OverviewPage({
  paylinks,
  warnings,
}: {
  paylinks: PaylinkRecord[];
  warnings: string[];
}) {
  const stats = getPaylinkStats(paylinks);

  return (
    <PageFrame headerMode="none">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Links creados" value={stats.total} accent="warm" />
        <SummaryCard label="Pagados" value={stats.paid} accent="success" />
        <SummaryCard label="Pendientes" value={stats.pending} accent="accent" />
        <SummaryCard label="Fallidos" value={stats.failed} accent="neutral" />
      </section>

      <section>
        <SectionCard>
          <SectionHeading eyebrow="Estado" title="Revisión rápida" />

          <div className="mt-6 space-y-3">
            {warnings.length > 0 ? (
              warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-[1.5rem] border border-amber-300/70 bg-amber-50/92 px-4 py-4 text-sm leading-7 text-amber-900 shadow-[0_14px_28px_rgba(215,154,78,0.12)] dark:border-amber-700/45 dark:bg-amber-950/30 dark:text-amber-100"
                >
                  {warning}
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-emerald-300/70 bg-emerald-50/92 px-4 py-4 text-sm leading-7 text-emerald-900 shadow-[0_14px_28px_rgba(16,185,129,0.08)] dark:border-emerald-700/45 dark:bg-emerald-950/30 dark:text-emerald-100">
                La configuración base parece completa y lista para operar.
              </div>
            )}
          </div>
        </SectionCard>
      </section>
    </PageFrame>
  );
}
