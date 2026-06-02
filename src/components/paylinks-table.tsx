"use client";

import { startTransition, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import {
  NoticeBanner,
  primaryButtonClassName,
  SectionCard,
  SectionHeading,
  secondaryButtonClassName,
  inputClassName,
  warmButtonClassName,
} from "@/components/panel-ui";
import { canOpenCheckout, canRecreatePaylink } from "@/lib/paylink-checkout";
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
  const [recreatingId, setRecreatingId] = useState<string | null>(null);

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

  async function recreatePaylink(id: string) {
    setRecreatingId(id);

    try {
      const response = await fetch(`/api/paylinks/${id}/recreate`, { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo recrear el link.");
      }

      setNotice({
        tone: "success",
        text: result.creationSummary?.message ?? "Se ha creado un nuevo link de pago.",
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo recrear el link.",
      });
    } finally {
      setRecreatingId(null);
    }
  }

  async function copyLink(id: string, url: string, canOpen: boolean) {
    if (!url || !canOpen) {
      setNotice({
        tone: "error",
        text: "Este pago ya no tiene un checkout reutilizable. Recrea un nuevo link para volver a cobrarlo.",
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
      />

      <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_200px_auto]" onSubmit={submitSearch}>
        <input
          key={paylinks.query}
          name="q"
          defaultValue={paylinks.query}
          placeholder="Buscar por concepto, cliente, teléfono, importe, moneda, emails, estado, IDs, URL, fechas, payload, destinatarios y más"
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
          <button type="submit" className={primaryButtonClassName}>
            Buscar
          </button>
          <button type="button" onClick={clearSearch} className={secondaryButtonClassName}>
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

      <div className="mt-6 overflow-hidden rounded-[1.8rem] border border-border/70 bg-surface/94 shadow-[0_16px_34px_rgba(58,44,34,0.07)] dark:bg-surface/58">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-[rgba(234,223,207,0.96)] dark:bg-surface-strong/80">
              <tr className="text-xs uppercase tracking-[0.18em] text-muted">
                <th className="px-4 py-4 font-medium">Concepto</th>
                <th className="px-4 py-4 font-medium">Importe</th>
                <th className="px-4 py-4 font-medium">Estado</th>
                <th className="px-4 py-4 font-medium">Aviso</th>
                <th className="px-4 py-4 font-medium">Creado</th>
                <th className="px-4 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/96 dark:bg-surface/58">
              {paylinks.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    {paylinks.query
                      ? "No hay resultados para esa búsqueda."
                      : "Todavía no hay links creados."}
                  </td>
                </tr>
              ) : (
                paylinks.items.map((paylink) => {
                  const canOpenCurrentCheckout = canOpenCheckout(paylink);
                  const canRecreateCurrentPaylink = canRecreatePaylink(paylink);
                  const customerDetails = [
                    paylink.customerName ? `Cliente: ${paylink.customerName}` : null,
                    paylink.customerPhone ? `Tel: ${paylink.customerPhone}` : null,
                  ].filter(Boolean) as string[];

                  return (
                    <tr key={paylink.id} className="align-top transition-colors hover:bg-background/45 dark:hover:bg-background/22">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{paylink.title}</p>
                          <p className="text-sm leading-6 text-muted">
                            {paylink.description || "Sin descripción"}
                          </p>
                          {customerDetails.length > 0 ? (
                            <p className="text-xs leading-5 text-muted">
                              {customerDetails.join(" · ")}
                            </p>
                          ) : null}
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
                            onClick={() =>
                              copyLink(
                                paylink.id,
                                paylink.checkoutUrl,
                                canOpenCurrentCheckout,
                              )
                            }
                            disabled={copyingId === paylink.id || !canOpenCurrentCheckout}
                            className={cn(secondaryButtonClassName, "rounded-[1rem] px-3 py-2 text-sm")}
                          >
                            {copyingId === paylink.id ? "Copiando..." : "Copiar link"}
                          </button>
                          <a
                            href={canOpenCurrentCheckout ? paylink.checkoutUrl : "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "rounded-[1rem] border px-3 py-2 text-center text-sm font-medium shadow-[0_10px_20px_rgba(58,44,34,0.05)]",
                              canOpenCurrentCheckout
                                ? "border-border/75 bg-surface/90 text-foreground hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                                : "pointer-events-none border-border/60 text-muted opacity-60",
                            )}
                          >
                            Abrir checkout
                          </a>
                          {canRecreateCurrentPaylink ? (
                            <button
                              type="button"
                              onClick={() => recreatePaylink(paylink.id)}
                              disabled={recreatingId === paylink.id}
                              className={cn(
                                "inline-flex items-center justify-center rounded-[1rem] border border-accent/50 bg-accent/8 px-3 py-2 text-sm font-semibold text-accent shadow-[0_10px_20px_rgba(154,79,36,0.08)] transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-accent/12",
                              )}
                            >
                              {recreatingId === paylink.id ? "Recreando..." : "Recrear link"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => syncPaylink(paylink.id)}
                            disabled={syncingId === paylink.id}
                            className={cn(warmButtonClassName, "rounded-[1rem] px-3 py-2 text-sm")}
                          >
                            {syncingId === paylink.id ? "Sincronizando..." : "Sincronizar"}
                          </button>
                          {!canOpenCurrentCheckout ? (
                            <p className="text-xs leading-5 text-muted">
                              {canRecreateCurrentPaylink
                                ? "Este pago ya no admite reabrir el checkout original. Crea uno nuevo para reintentarlo."
                                : "Este pago ya está completado o no necesita reabrirse."}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => changePage(paylinks.page - 1)} disabled={paylinks.page <= 1} className={secondaryButtonClassName}>
          Página anterior
        </button>
        <button type="button" onClick={() => changePage(paylinks.page + 1)} disabled={paylinks.page >= paylinks.totalPages} className={secondaryButtonClassName}>
          Página siguiente
        </button>
      </div>
    </SectionCard>
  );
}
