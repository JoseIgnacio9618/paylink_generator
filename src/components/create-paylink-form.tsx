"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_PAYMENT_METHODS } from "@/lib/constants";
import type { MoneiCheckoutSnapshot, SettingsRecord } from "@/lib/types";
import { cn, formatPaymentMethodLabel, formatPaymentMethodList } from "@/lib/utils";
import {
  Field,
  InfoPopover,
  Label,
  NoticeBanner,
  primaryButtonClassName,
  secondaryButtonClassName,
  SectionCard,
  SectionHeading,
  TextareaField,
} from "@/components/panel-ui";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

type CreationSummary = {
  requestedPaymentMethods: string[];
  availablePaymentMethods: string[];
  omittedPaymentMethods: Array<{
    method: string;
    reason: string;
  }>;
  historyHref: string;
  message: string;
};

export function CreatePaylinkForm({
  settings,
  accountSnapshot,
}: {
  settings: SettingsRecord;
  accountSnapshot: MoneiCheckoutSnapshot | null;
}) {
  const router = useRouter();
  const availablePaymentMethods = accountSnapshot?.paymentMethods ?? [];
  const initialAllowedPaymentMethods = resolveInitialPaymentMethods(
    settings.allowedPaymentMethods,
    availablePaymentMethods,
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    currency: settings.defaultCurrency,
    recipientEmail: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    allowedPaymentMethods: initialAllowedPaymentMethods,
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [creationSummary, setCreationSummary] = useState<CreationSummary | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const removedDefaultMethods =
    availablePaymentMethods.length > 0
      ? settings.allowedPaymentMethods.filter(
          (method) => !initialAllowedPaymentMethods.includes(method),
        )
      : [];

  async function createPaylink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setNotice(null);

    try {
      const response = await fetch("/api/paylinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo crear el link.");
      }

      setForm({
        title: "",
        description: "",
        amount: "",
        currency: settings.defaultCurrency,
        recipientEmail: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        allowedPaymentMethods: initialAllowedPaymentMethods,
      });
      setCreationSummary(
        result.creationSummary ?? {
          requestedPaymentMethods: form.allowedPaymentMethods,
          availablePaymentMethods: form.allowedPaymentMethods,
          omittedPaymentMethods: [],
          historyHref: "/historial",
          message:
            result.warning ??
            "Link de pago creado correctamente y preparado en MONEI con los métodos elegidos.",
        },
      );
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo crear el link.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Nuevo cobro"
        title="Crear link de pago"
      />

      <form className="mt-6 space-y-5" onSubmit={createPaylink}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Título"
            name="title"
            value={form.title}
            required
            maxLength={120}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />
          <Field
            label="Precio"
            name="amount"
            placeholder="49.90"
            value={form.amount}
            required
            inputMode="decimal"
            pattern="^\d+([.,]\d{1,2})?$"
            title="Introduce un importe válido con hasta 2 decimales."
            onChange={(value) => setForm((current) => ({ ...current, amount: value }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_140px]">
          <TextareaField
            label="Descripción"
            name="description"
            value={form.description}
            maxLength={500}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label text="Moneda" />
              {accountSnapshot ? (
                <InfoPopover title="Checkout en MONEI">
                  <p>
                    La disponibilidad final de los métodos se recalcula al crear el checkout y puede variar según el importe, la moneda o el país.
                  </p>
                </InfoPopover>
              ) : null}
            </div>
            <div className="flex h-[54px] items-center rounded-[1.35rem] border border-border/80 bg-surface/96 px-4 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_30px_rgba(58,44,34,0.08)] dark:bg-background/65">
              EUR
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Email extra de aviso"
            name="recipientEmail"
            placeholder="alertas@tuempresa.com"
            value={form.recipientEmail}
            type="email"
            autoComplete="email"
            onChange={(value) =>
              setForm((current) => ({ ...current, recipientEmail: value }))
            }
          />
          <Field
            label="Email del cliente"
            name="customerEmail"
            placeholder="cliente@ejemplo.com"
            value={form.customerEmail}
            type="email"
            autoComplete="email"
            onChange={(value) =>
              setForm((current) => ({ ...current, customerEmail: value }))
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre del cliente"
            name="customerName"
            value={form.customerName}
            maxLength={120}
            onChange={(value) =>
              setForm((current) => ({ ...current, customerName: value }))
            }
          />
          <Field
            label="Teléfono del cliente"
            name="customerPhone"
            placeholder="+34600000000"
            value={form.customerPhone}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            pattern="^[+()\-\\d\\s]{6,20}$"
            title="Introduce un teléfono válido."
            onChange={(value) =>
              setForm((current) => ({ ...current, customerPhone: value }))
            }
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label text="Métodos de pago permitidos" />
            {accountSnapshot ? (
              <InfoPopover title="Checkout real en MONEI">
                <p>
                  Comercio visible:{" "}
                  <strong>{accountSnapshot.merchantName || settings.merchantDisplayName}</strong>
                </p>
                <p>
                  Métodos activos ahora mismo:{" "}
                  <strong>
                    {accountSnapshot.paymentMethods.length > 0
                      ? formatPaymentMethodList(accountSnapshot.paymentMethods)
                      : "ninguno compatible con esta app"}
                  </strong>
                </p>
                {removedDefaultMethods.length > 0 ? (
                  <p>
                    Se han quitado de la selección inicial{" "}
                    <strong>{formatPaymentMethodList(removedDefaultMethods)}</strong> porque no están activos en tu cuenta.
                  </p>
                ) : null}
              </InfoPopover>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_PAYMENT_METHODS.map((method) => {
              const checked = form.allowedPaymentMethods.includes(method);
              const available =
                availablePaymentMethods.length === 0 || availablePaymentMethods.includes(method);

              return (
                <button
                  key={method}
                  type="button"
                  disabled={!available}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      allowedPaymentMethods: toggleArrayItem(
                        current.allowedPaymentMethods,
                        method,
                      ),
                    }))
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-2.5 text-sm font-medium shadow-[0_10px_18px_rgba(58,44,34,0.05)] transition-all",
                    checked
                      ? "border-accent bg-accent text-white"
                      : available
                        ? "border-border/75 bg-surface text-foreground hover:-translate-y-0.5 hover:border-accent/40"
                        : "cursor-not-allowed border-border/60 bg-surface/55 text-muted/70 opacity-60",
                  )}
                >
                  {formatPaymentMethodLabel(method)}
                </button>
              );
            })}
          </div>
          {form.allowedPaymentMethods.length === 0 ? (
            <p className="text-sm leading-6 text-rose-700">
              Necesitas al menos un método de pago activo en MONEI para crear el checkout.
            </p>
          ) : null}
        </div>

        <NoticeBanner notice={notice} />

        <button
          type="submit"
          disabled={isCreating || form.allowedPaymentMethods.length === 0}
          className={`${primaryButtonClassName} w-full`}
        >
          {isCreating ? "Creando..." : "Crear link y registrar pago"}
        </button>
      </form>

      <CreationResultModal
        summary={creationSummary}
        onClose={() => setCreationSummary(null)}
      />
    </SectionCard>
  );
}

function toggleArrayItem(current: string[], item: string) {
  return current.includes(item)
    ? current.filter((value) => value !== item)
    : [...current, item];
}

function resolveInitialPaymentMethods(preferred: string[], available: string[]) {
  if (available.length === 0) {
    return preferred;
  }

  const matched = preferred.filter((method) => available.includes(method));
  return matched.length > 0 ? matched : [...available];
}

function CreationResultModal({
  summary,
  onClose,
}: {
  summary: CreationSummary | null;
  onClose: () => void;
}) {
  if (!summary) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2.1rem] border border-border/70 bg-surface/96 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
          Pago creado
        </p>
        <h3 className="mt-3 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-foreground">
          El checkout ya está listo
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted">{summary.message}</p>

        <div className="mt-6 grid gap-4 rounded-[1.7rem] border border-border/70 bg-surface/94 p-4 md:grid-cols-2 dark:bg-background/42">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Pediste
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {summary.requestedPaymentMethods.length > 0
                ? formatPaymentMethodList(summary.requestedPaymentMethods)
                : "Sin métodos seleccionados"}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Quedó disponible
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {summary.availablePaymentMethods.length > 0
                ? formatPaymentMethodList(summary.availablePaymentMethods)
                : "MONEI no dejó métodos disponibles en el checkout final"}
            </p>
          </div>
        </div>

        {summary.omittedPaymentMethods.length > 0 ? (
          <div className="mt-6 space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-700">
              Métodos omitidos
            </p>
            {summary.omittedPaymentMethods.map((item) => (
              <div
                key={item.method}
                className="rounded-[1.5rem] border border-amber-300/70 bg-amber-50/92 px-4 py-3"
              >
                <p className="text-sm font-semibold text-amber-900">
                  {formatPaymentMethodLabel(item.method)}
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-emerald-300/70 bg-emerald-50/92 px-4 py-3">
            <p className="text-sm leading-6 text-emerald-800">
              MONEI ha conservado todos los métodos que marcaste al crear este checkout.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>
            Seguir aquí
          </button>
          <Link href={summary.historyHref} className={primaryButtonClassName}>
            Ir al histórico
          </Link>
        </div>
      </div>
    </div>
  );
}
