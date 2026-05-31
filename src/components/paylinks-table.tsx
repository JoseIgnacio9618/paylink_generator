"use client";

import { startTransition, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import {
  NoticeBanner,
  SectionCard,
  SectionHeading,
  inputClassName,
} from "@/components/panel-ui";
import type { PaginatedPaylinksResult } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

export function PaylinksTable({ paylinks }: { paylinks: PaginatedPaylinksResult }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<Notice>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  async function syncPaylink(id: string) {
    setSyncingId(id);

    try {
      const response = await fetch(`/api/paylinks/${id}/sync`, { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo sincronizar el pago.");
      }

      setNotice({ tone: "success", text: "Estado sincronizado con MONEI." });
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo sincronizar el pago.",
      });
    } finally {
      setSyncingId(null);
    }
  }

  async function copyLink(id: string, url: string) {
    if (!url) {
      setNotice({
        tone: "error",
        text: "Este pago todavía no tiene URL de checkout disponible.",
      });
      return;
    }

    setCopyingId(id);

    try {
      await navigator.clipboard.writeText(url);
      setNotice({ tone: "success", text: "Link copiado al portapapeles." });
    } catch {
      setNotice({ tone: "error", text: "No se pudo copiar el link." });
    } finally {
      setCopyingId(null);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();

    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }

    params.set("page", "1");
    navigateWithParams(params);
  }

  function clearSearch() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.set("page", "1");
    navigateWithParams(params);
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    navigateWithParams(params);
  }

  function changePageSize(nextPageSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    navigateWithParams(params);
  }

  function navigateWithParams(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Historial"
        title="Links y estados de pago"
        description="Busca sobre todos los campos guardados y navega el histórico por páginas sin cargar toda la tabla de una vez."
      />

      <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_auto]" onSubmit={submitSearch}>
        <input
          key={paylinks.query}
          name="q"
          defaultValue={paylinks.query}
          placeholder="Buscar por concepto, importe, moneda, emails, estado, IDs, URL, fechas, payload, destinatarios y más"
          className={inputClassName}
        />
        <select
          value={String(paylinks.pageSize)}
          onChange={(event) => changePageSize(event.target.value)}
          className={inputClassName}
        >
          <option value="10">10 por página</option>
          <option value="25">25 por página</option>
          <option value="50">50 por página</option>
          <option value="100">100 por página</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
          >
            Limpiar
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          {paylinks.total} resultado{paylinks.total === 1 ? "" : "s"}
          {paylinks.query ? ` para “${paylinks.query}”` : ""}
        </p>
        <p>
          Página {paylinks.page} de {paylinks.totalPages}
        </p>
      </div>

      <div className="mt-6">
        <NoticeBanner notice={notice} />
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-surface-strong/90">
              <tr className="text-xs uppercase tracking-[0.18em] text-muted">
                <th className="px-4 py-4 font-medium">Concepto</th>
                <th className="px-4 py-4 font-medium">Importe</th>
                <th className="px-4 py-4 font-medium">Estado</th>
                <th className="px-4 py-4 font-medium">Aviso</th>
                <th className="px-4 py-4 font-medium">Creado</th>
                <th className="px-4 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/65">
              {paylinks.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    {paylinks.query
                      ? "No hay resultados para esa búsqueda."
                      : "Todavía no hay links creados."}
                  </td>
                </tr>
              ) : (
                paylinks.items.map((paylink) => (
                  <tr key={paylink.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{paylink.title}</p>
                        <p className="text-sm leading-6 text-muted">
                          {paylink.description || "Sin descripción"}
                        </p>
                        {paylink.ownerDisplayName ? (
                          <p className="text-xs text-muted">
                            Propietario: {paylink.ownerDisplayName}
                            {paylink.ownerUsername ? ` (@${paylink.ownerUsername})` : ""}
                          </p>
                        ) : null}
                        <p className="font-mono text-xs text-muted">{paylink.moneiPaymentId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-foreground">
                      {formatCurrency(paylink.amountCents, paylink.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <StatusBadge status={paylink.moneiStatus} />
                        {paylink.paidAt ? (
                          <p className="text-xs text-muted">
                            Pagado: {new Date(paylink.paidAt).toLocaleString("es-ES")}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2 text-sm text-muted">
                        <p>{paylink.notificationRecipients.join(", ") || "Sin destinatarios"}</p>
                        <p>
                          {paylink.notificationSentAt
                            ? `Enviado ${new Date(paylink.notificationSentAt).toLocaleString("es-ES")}`
                            : paylink.notificationError || "Pendiente"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted">
                      {new Date(paylink.createdAt).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(paylink.id, paylink.paymentUrl)}
                          disabled={copyingId === paylink.id}
                          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {copyingId === paylink.id ? "Copiando..." : "Copiar link"}
                        </button>
                        <a
                          href={paylink.paymentUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "rounded-xl border px-3 py-2 text-center text-sm font-medium",
                            paylink.paymentUrl
                              ? "border-border text-foreground hover:border-accent hover:text-accent"
                              : "pointer-events-none border-border/60 text-muted opacity-60",
                          )}
                        >
                          Abrir checkout
                        </a>
                        <button
                          type="button"
                          onClick={() => syncPaylink(paylink.id)}
                          disabled={syncingId === paylink.id}
                          className="rounded-xl bg-accent-warm px-3 py-2 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {syncingId === paylink.id ? "Sincronizando..." : "Sincronizar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changePage(paylinks.page - 1)}
          disabled={paylinks.page <= 1}
          className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Página anterior
        </button>
        <button
          type="button"
          onClick={() => changePage(paylinks.page + 1)}
          disabled={paylinks.page >= paylinks.totalPages}
          className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Página siguiente
        </button>
      </div>
    </SectionCard>
  );
}
