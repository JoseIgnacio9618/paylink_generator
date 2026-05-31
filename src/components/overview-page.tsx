import Link from "next/link";
import { PageFrame, SectionCard, SectionHeading, SummaryCard } from "@/components/panel-ui";
import { APP_NAV_ITEMS } from "@/lib/navigation";
import { getPaylinkStats } from "@/lib/stats";
import type { PaylinkRecord, SettingsRecord, UserRecord } from "@/lib/types";

export function OverviewPage({
  settings,
  currentUser,
  paylinks,
  warnings,
}: {
  settings: SettingsRecord;
  currentUser: UserRecord;
  paylinks: PaylinkRecord[];
  warnings: string[];
}) {
  const stats = getPaylinkStats(paylinks);
  const navItems = APP_NAV_ITEMS.filter(
    (item) => item.href !== "/" && (!item.superadminOnly || currentUser.role === "superadmin"),
  );

  return (
    <PageFrame
      eyebrow="Resumen"
      title={settings.appName}
      description="Gestiona la aplicación por secciones: crea cobros, revisa el historial, controla alertas y cambia la configuración sin tenerlo todo mezclado en una sola pantalla."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Links creados" value={stats.total} accent="warm" />
        <SummaryCard label="Pagados" value={stats.paid} accent="success" />
        <SummaryCard label="Pendientes" value={stats.pending} accent="accent" />
        <SummaryCard label="Fallidos" value={stats.failed} accent="neutral" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Navegación"
            title="Muévete por la app"
            description="También puedes usar el menú desplegable superior para saltar directamente entre las distintas áreas."
          />

          <div className="mt-6 grid gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[1.4rem] border border-border bg-surface/75 px-5 py-4 hover:border-accent/40 hover:bg-surface-strong"
              >
                <p className="text-lg font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Estado"
            title="Revisión rápida"
            description="Estas alertas te dicen si falta alguna pieza para operar con normalidad."
          />

          <div className="mt-6 space-y-3">
            {warnings.length > 0 ? (
              warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-[1.4rem] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm leading-6 text-amber-900"
                >
                  {warning}
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-sm leading-6 text-emerald-900">
                La configuración base parece completa y lista para operar.
              </div>
            )}
          </div>
        </SectionCard>
      </section>
    </PageFrame>
  );
}
