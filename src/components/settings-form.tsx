"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_PAYMENT_METHODS } from "@/lib/constants";
import { isPublicBaseUrl } from "@/lib/paylink-checkout";
import type { MoneiCheckoutSnapshot, SettingsRecord } from "@/lib/types";
import { cn, formatPaymentMethodLabel, formatPaymentMethodList } from "@/lib/utils";
import {
  Field,
  InfoButton,
  InfoModal,
  Label,
  NoticeBanner,
  primaryButtonClassName,
  SectionCard,
  SectionHeading,
  TextareaField,
} from "@/components/panel-ui";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

type InfoDefinition = {
  title: string;
  what: string;
  where: string;
};

type InfoKey =
  | "appName"
  | "merchantDisplayName"
  | "baseUrl"
  | "defaultCurrency"
  | "callbackPath"
  | "notificationDefaultEmail"
  | "moneiApiKey"
  | "moneiAccountId"
  | "allowedPaymentMethods"
  | "completeUrl"
  | "failUrl"
  | "cancelUrl"
  | "smtpHost"
  | "smtpFrom"
  | "smtpPort"
  | "smtpFromName"
  | "smtpUser"
  | "smtpPass"
  | "smtpSecure"
  | "emailSubjectTemplate"
  | "emailBodyTemplate";

const FIELD_INFO: Record<InfoKey, InfoDefinition> = {
  appName: {
    title: "Nombre de la app",
    what: "Es el nombre visible de tu panel. Se muestra en la parte superior de la aplicación.",
    where: "Lo defines tú mismo. Usa un nombre corto y reconocible para tu negocio o proyecto.",
  },
  merchantDisplayName: {
    title: "Nombre del comercio",
    what: "Es el nombre público que verá el cliente en el checkout hosted de MONEI.",
    where: "Lo defines tú mismo. Al guardarlo, la app lo sincroniza con la cuenta de MONEI para que deje de aparecer el valor por defecto del checkout.",
  },
  baseUrl: {
    title: "Base URL",
    what: "Es la URL pública principal de esta aplicación. Se usa para construir callbacks y redirecciones absolutas.",
    where: "Debe ser el dominio donde tengas publicada la app, por ejemplo `https://pagos.tudominio.com`.",
  },
  defaultCurrency: {
    title: "Moneda por defecto",
    what: "Es la moneda que se propone al crear nuevos links de pago.",
    where: "Debes poner un código ISO 4217 de tres letras, por ejemplo `EUR`, `USD` o `GBP`.",
  },
  callbackPath: {
    title: "Path del webhook",
    what: "Es la ruta interna donde MONEI enviará las notificaciones del estado real de cada pago.",
    where: "Normalmente puedes dejar `/api/monei/webhook`. Luego debes configurar en MONEI la URL completa formada por `Base URL + path`.",
  },
  notificationDefaultEmail: {
    title: "Email estándar",
    what: "Es el destinatario fijo que siempre recibe el aviso cuando un pago se confirma.",
    where: "Usa un email operativo tuyo, por ejemplo `operaciones@tuempresa.com`.",
  },
  moneiApiKey: {
    title: "MONEI API key",
    what: "Es la credencial principal con la que esta app crea pagos, consulta estados y verifica webhooks.",
    where: "La obtienes en el panel de MONEI, dentro de la configuración de desarrollador o sección API.",
  },
  moneiAccountId: {
    title: "MONEI account ID",
    what: "Sirve para actuar sobre una cuenta concreta cuando trabajas con cuentas conectadas o varios merchants. En el flujo normal de esta app no hace falta enviarlo.",
    where: "Solo lo necesitas en escenarios avanzados. Si aplica, lo encontrarás en el panel de MONEI asociado a la cuenta. Si no usas multicuenta, déjalo vacío.",
  },
  allowedPaymentMethods: {
    title: "Métodos de pago por defecto",
    what: "Define qué métodos propondrá la app al crear nuevos links de pago. Google Pay, Apple Pay y Click to Pay se pueden controlar por separado cuando MONEI los tenga activos en tu cuenta.",
    where: "Debes elegir solo métodos que tengas habilitados en tu cuenta de MONEI.",
  },
  completeUrl: {
    title: "Complete URL",
    what: "Es la página a la que vuelve el cliente cuando el checkout termina.",
    where: "Puedes poner una ruta de tu propia web o dejarlo vacío para usar el fallback interno de la app.",
  },
  failUrl: {
    title: "Fail URL",
    what: "Es la página de retorno cuando el pago falla.",
    where: "Suele ser una URL tuya con instrucciones para reintentar o contactar contigo.",
  },
  cancelUrl: {
    title: "Cancel URL",
    what: "Es la página de retorno si el cliente cancela el checkout.",
    where: "Puedes usar una URL informativa de tu web o dejar el comportamiento por defecto.",
  },
  smtpHost: {
    title: "SMTP host",
    what: "Es el servidor saliente que se usará para enviar los emails de confirmación.",
    where: "Te lo da tu proveedor de correo, por ejemplo Google Workspace, Microsoft 365, SendGrid, Mailgun, etc.",
  },
  smtpFrom: {
    title: "SMTP from",
    what: "Es el email remitente que verá el destinatario.",
    where: "Debe ser una dirección válida de tu dominio o del buzón autorizado por tu proveedor SMTP.",
  },
  smtpPort: {
    title: "SMTP port",
    what: "Es el puerto del servidor SMTP.",
    where: "Lo indica tu proveedor. Los más habituales son `587` para TLS/STARTTLS y `465` para SSL.",
  },
  smtpFromName: {
    title: "Nombre remitente",
    what: "Es el nombre visible del emisor del correo.",
    where: "Lo defines tú, por ejemplo el nombre de tu empresa o del departamento de cobros.",
  },
  smtpUser: {
    title: "SMTP user",
    what: "Es el usuario con el que la app se autentica en el servidor SMTP.",
    where: "Normalmente es el email completo o el usuario técnico que te proporciona tu proveedor.",
  },
  smtpPass: {
    title: "SMTP password",
    what: "Es la contraseña o token de autenticación del usuario SMTP.",
    where: "La proporciona tu servicio de correo. A veces es una contraseña específica de aplicación.",
  },
  smtpSecure: {
    title: "Conexión segura SMTP",
    what: "Activa conexión segura directa. Suele usarse con el puerto 465.",
    where: "Revísalo en la documentación de tu proveedor SMTP. Si usas 587 normalmente se deja desactivado.",
  },
  emailSubjectTemplate: {
    title: "Asunto del email",
    what: "Es la plantilla del asunto del correo de confirmación.",
    where: "La escribes tú. Puedes usar variables como `{{title}}` para personalizarlo.",
  },
  emailBodyTemplate: {
    title: "Cuerpo del email",
    what: "Es la plantilla de texto del correo de confirmación.",
    where: "La escribes tú. Puedes incluir variables como `{{title}}`, `{{price}}`, `{{status}}`, `{{orderId}}`, `{{customerName}}`, `{{customerEmail}}` o `{{customerPhone}}`. Esa plantilla se usa tanto para la versión texto como para el bloque principal del email HTML.",
  },
};

export function SettingsForm({
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
    ...settings,
    allowedPaymentMethods: initialAllowedPaymentMethods,
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoKey | null>(null);
  const activeInfoContent = useMemo(
    () => (activeInfo ? FIELD_INFO[activeInfo] : null),
    [activeInfo],
  );
  const baseUrlLooksPublic = isPublicBaseUrl(form.baseUrl);
  const removedDefaultMethods =
    availablePaymentMethods.length > 0
      ? settings.allowedPaymentMethods.filter(
          (method) => !initialAllowedPaymentMethods.includes(method),
        )
      : [];

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo guardar la configuración.");
      }

      setNotice({ tone: "success", text: "Configuración actualizada." });
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error ? error.message : "No se pudo guardar la configuración.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Configuración"
        title="Ajustes de la aplicación"
      />

      {accountSnapshot ? (
        <div className="mt-6 rounded-[1.7rem] border border-border/70 bg-surface/94 p-5 shadow-[0_14px_28px_rgba(58,44,34,0.06)] dark:bg-background/42">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Estado de la cuenta MONEI
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground">
            Nombre visible actual en checkout:{" "}
            <strong>{accountSnapshot.merchantName || settings.merchantDisplayName}</strong>
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Métodos activos en esta cuenta:{" "}
            {accountSnapshot.paymentMethods.length > 0
              ? formatPaymentMethodList(accountSnapshot.paymentMethods)
              : "ninguno compatible con esta app"}
          </p>
          {removedDefaultMethods.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-amber-700">
              Se han limpiado de la selección inicial {formatPaymentMethodList(removedDefaultMethods)} porque ahora mismo no están activos en MONEI.
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="mt-6 space-y-5" onSubmit={saveSettings}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre de la app"
            name="appName"
            value={form.appName}
            onChange={(value) => setForm((current) => ({ ...current, appName: value }))}
            labelAction={<InfoButton onClick={() => setActiveInfo("appName")} />}
          />
          <Field
            label="Nombre del comercio"
            name="merchantDisplayName"
            value={form.merchantDisplayName}
            onChange={(value) =>
              setForm((current) => ({ ...current, merchantDisplayName: value }))
            }
            labelAction={<InfoButton onClick={() => setActiveInfo("merchantDisplayName")} />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Base URL"
            name="baseUrl"
            placeholder="https://tu-dominio.com"
            value={form.baseUrl}
            onChange={(value) => setForm((current) => ({ ...current, baseUrl: value }))}
            labelAction={<InfoButton onClick={() => setActiveInfo("baseUrl")} />}
          />
        </div>
        {form.baseUrl.trim() && !baseUrlLooksPublic ? (
          <div className="rounded-[1.4rem] border border-amber-300/75 bg-amber-50/95 px-4 py-4 text-sm leading-6 text-amber-900 dark:border-amber-700/45 dark:bg-amber-950/30 dark:text-amber-100">
            La `Base URL` actual no es pública. Si mantienes `localhost` o `127.0.0.1`, MONEI no podrá llamar al webhook ni cerrar bien el flujo final del pago. Para pruebas usa una URL pública o un túnel como `ngrok` o `Cloudflare Tunnel`.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Moneda por defecto"
            name="defaultCurrency"
            value={form.defaultCurrency}
            onChange={(value) =>
              setForm((current) => ({ ...current, defaultCurrency: value.toUpperCase() }))
            }
            labelAction={<InfoButton onClick={() => setActiveInfo("defaultCurrency")} />}
          />
          <Field
            label="Path del webhook"
            name="callbackPath"
            value={form.callbackPath}
            onChange={(value) => setForm((current) => ({ ...current, callbackPath: value }))}
            labelAction={<InfoButton onClick={() => setActiveInfo("callbackPath")} />}
          />
          <Field
            label="Email estándar"
            name="notificationDefaultEmail"
            placeholder="operaciones@tuempresa.com"
            value={form.notificationDefaultEmail}
            onChange={(value) =>
              setForm((current) => ({ ...current, notificationDefaultEmail: value }))
            }
            labelAction={<InfoButton onClick={() => setActiveInfo("notificationDefaultEmail")} />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="MONEI API key"
            name="moneiApiKey"
            value={form.moneiApiKey}
            onChange={(value) => setForm((current) => ({ ...current, moneiApiKey: value }))}
            labelAction={<InfoButton onClick={() => setActiveInfo("moneiApiKey")} />}
          />
          <Field
            label="MONEI account ID"
            name="moneiAccountId"
            placeholder="Opcional"
            value={form.moneiAccountId}
            onChange={(value) =>
              setForm((current) => ({ ...current, moneiAccountId: value }))
            }
            labelAction={<InfoButton onClick={() => setActiveInfo("moneiAccountId")} />}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label text="Métodos de pago por defecto" />
            <InfoButton onClick={() => setActiveInfo("allowedPaymentMethods")} />
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
          {availablePaymentMethods.length > 0 ? (
            <p className="text-sm leading-6 text-muted">
              Solo puedes dejar como predeterminados los métodos que tu cuenta tiene activos en MONEI.
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.7rem] border border-border/70 bg-surface/94 p-5 shadow-[0_14px_28px_rgba(58,44,34,0.06)] dark:bg-background/42">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Redirecciones del checkout
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field
              label="Complete URL"
              name="completeUrl"
              value={form.completeUrl}
              onChange={(value) => setForm((current) => ({ ...current, completeUrl: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("completeUrl")} />}
            />
            <Field
              label="Fail URL"
              name="failUrl"
              value={form.failUrl}
              onChange={(value) => setForm((current) => ({ ...current, failUrl: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("failUrl")} />}
            />
            <Field
              label="Cancel URL"
              name="cancelUrl"
              value={form.cancelUrl}
              onChange={(value) => setForm((current) => ({ ...current, cancelUrl: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("cancelUrl")} />}
            />
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-border/70 bg-surface/94 p-5 shadow-[0_14px_28px_rgba(58,44,34,0.06)] dark:bg-background/42">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            SMTP y plantillas
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="SMTP host"
              name="smtpHost"
              value={form.smtpHost}
              onChange={(value) => setForm((current) => ({ ...current, smtpHost: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("smtpHost")} />}
            />
            <Field
              label="SMTP from"
              name="smtpFrom"
              placeholder="no-reply@tuempresa.com"
              value={form.smtpFrom}
              onChange={(value) => setForm((current) => ({ ...current, smtpFrom: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("smtpFrom")} />}
            />
            <Field
              label="SMTP port"
              name="smtpPort"
              value={String(form.smtpPort)}
              onChange={(value) =>
                setForm((current) => ({ ...current, smtpPort: Number(value) || 0 }))
              }
              labelAction={<InfoButton onClick={() => setActiveInfo("smtpPort")} />}
            />
            <Field
              label="Nombre remitente"
              name="smtpFromName"
              value={form.smtpFromName}
              onChange={(value) => setForm((current) => ({ ...current, smtpFromName: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("smtpFromName")} />}
            />
            <Field
              label="SMTP user"
              name="smtpUser"
              value={form.smtpUser}
              onChange={(value) => setForm((current) => ({ ...current, smtpUser: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("smtpUser")} />}
            />
            <Field
              label="SMTP password"
              name="smtpPass"
              value={form.smtpPass}
              onChange={(value) => setForm((current) => ({ ...current, smtpPass: value }))}
              labelAction={<InfoButton onClick={() => setActiveInfo("smtpPass")} />}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(event) =>
                  setForm((current) => ({ ...current, smtpSecure: event.target.checked }))
                }
                className="size-4 rounded border-border text-accent focus:ring-accent"
              />
              Usar conexión segura (`secure`)
            </label>
            <InfoButton onClick={() => setActiveInfo("smtpSecure")} />
          </div>
          <div className="mt-4 space-y-4">
            <Field
              label="Asunto del email"
              name="emailSubjectTemplate"
              value={form.emailSubjectTemplate}
              onChange={(value) =>
                setForm((current) => ({ ...current, emailSubjectTemplate: value }))
              }
              labelAction={<InfoButton onClick={() => setActiveInfo("emailSubjectTemplate")} />}
            />
            <TextareaField
              label="Cuerpo del email"
              name="emailBodyTemplate"
              value={form.emailBodyTemplate}
              onChange={(value) =>
                setForm((current) => ({ ...current, emailBodyTemplate: value }))
              }
              labelAction={<InfoButton onClick={() => setActiveInfo("emailBodyTemplate")} />}
            />
          </div>
        </div>

        <NoticeBanner notice={notice} />

        <button
          type="submit"
          disabled={isSaving}
          className={primaryButtonClassName}
        >
          {isSaving ? "Guardando..." : "Guardar configuración"}
        </button>
      </form>

      <InfoModal
        title={activeInfoContent?.title}
        isOpen={Boolean(activeInfoContent)}
        onClose={() => setActiveInfo(null)}
      >
        {activeInfoContent ? (
          <div className="space-y-5">
            <div className="rounded-[1.35rem] border border-border/70 bg-background/38 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Qué es
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeInfoContent.what}</p>
            </div>

            <div className="rounded-[1.35rem] border border-border/70 bg-background/38 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Dónde obtenerlo
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeInfoContent.where}</p>
            </div>
          </div>
        ) : null}
      </InfoModal>
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
