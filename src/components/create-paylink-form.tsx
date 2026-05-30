"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_PAYMENT_METHODS } from "@/lib/constants";
import type { MoneiCheckoutSnapshot, SettingsRecord } from "@/lib/types";
import { cn, formatPaymentMethodLabel, formatPaymentMethodList } from "@/lib/utils";
import {
  Field,
  Label,
  NoticeBanner,
  SectionCard,
  SectionHeading,
  TextareaField,
} from "@/components/panel-ui";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

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
      setNotice({
        tone: "success",
        text:
          result.warning ??
          "Link de pago creado correctamente y preparado en MONEI con los métodos elegidos.",
      });
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
        description="Define el artículo o servicio, el importe y el email adicional que debe recibir el aviso cuando se confirme el pago."
      />

      {accountSnapshot ? (
        <div className="mt-6 rounded-[1.5rem] border border-border bg-surface-strong/70 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Checkout real en MONEI
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground">
            Comercio visible: <strong>{accountSnapshot.merchantName || settings.merchantDisplayName}</strong>
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Métodos activos ahora mismo:{" "}
            {accountSnapshot.paymentMethods.length > 0
              ? formatPaymentMethodList(accountSnapshot.paymentMethods)
              : "ninguno compatible con esta app"}
          </p>
          {removedDefaultMethods.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-amber-700">
              Se han quitado de la selección inicial {formatPaymentMethodList(removedDefaultMethods)} porque no están activos en tu cuenta.
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={createPaylink}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Título"
            name="title"
            value={form.title}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />
          <Field
            label="Precio"
            name="amount"
            placeholder="49.90"
            value={form.amount}
            onChange={(value) => setForm((current) => ({ ...current, amount: value }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_140px]">
          <TextareaField
            label="Descripción"
            name="description"
            value={form.description}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          />
          <Field
            label="Moneda"
            name="currency"
            placeholder="EUR"
            value={form.currency}
            onChange={(value) =>
              setForm((current) => ({ ...current, currency: value.toUpperCase() }))
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Email extra de aviso"
            name="recipientEmail"
            placeholder="alertas@tuempresa.com"
            value={form.recipientEmail}
            onChange={(value) =>
              setForm((current) => ({ ...current, recipientEmail: value }))
            }
          />
          <Field
            label="Email del cliente"
            name="customerEmail"
            placeholder="cliente@ejemplo.com"
            value={form.customerEmail}
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
            onChange={(value) =>
              setForm((current) => ({ ...current, customerName: value }))
            }
          />
          <Field
            label="Teléfono del cliente"
            name="customerPhone"
            placeholder="+34600000000"
            value={form.customerPhone}
            onChange={(value) =>
              setForm((current) => ({ ...current, customerPhone: value }))
            }
          />
        </div>

        <div className="space-y-3">
          <Label text="Métodos de pago permitidos" />
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
                    "rounded-full border px-3 py-2 text-sm font-medium",
                    checked
                      ? "border-accent bg-accent text-white"
                      : available
                        ? "border-border bg-surface text-foreground hover:border-accent/40"
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
          className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isCreating ? "Creando..." : "Crear link y registrar pago"}
        </button>
      </form>
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
