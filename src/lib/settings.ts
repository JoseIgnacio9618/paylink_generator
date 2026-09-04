import { execute, queryOne } from "@/lib/db";
import { isPublicBaseUrl } from "@/lib/paylink-checkout";
import type { SettingsRecord } from "@/lib/types";
import { nowIso, parseJsonArray } from "@/lib/utils";

type SettingsRow = {
  app_name: string;
  merchant_display_name: string;
  base_url: string;
  default_currency: string;
  allowed_payment_methods: string;
  monei_api_key: string;
  monei_account_id: string;
  callback_path: string;
  complete_url: string;
  fail_url: string;
  cancel_url: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_from_name: string;
  notification_default_email: string;
  email_subject_template: string;
  email_body_template: string;
  created_at: string;
  updated_at: string;
};

function mapSettingsRow(row: SettingsRow): SettingsRecord {
  return {
    appName: row.app_name,
    merchantDisplayName: row.merchant_display_name || row.app_name,
    baseUrl: row.base_url,
    defaultCurrency: "EUR",
    allowedPaymentMethods: parseJsonArray(row.allowed_payment_methods),
    moneiApiKey: row.monei_api_key,
    moneiAccountId: row.monei_account_id,
    callbackPath: row.callback_path,
    completeUrl: row.complete_url,
    failUrl: row.fail_url,
    cancelUrl: row.cancel_url,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: row.smtp_secure,
    smtpUser: row.smtp_user,
    smtpPass: row.smtp_pass,
    smtpFrom: row.smtp_from,
    smtpFromName: row.smtp_from_name,
    notificationDefaultEmail: row.notification_default_email,
    emailSubjectTemplate: row.email_subject_template,
    emailBodyTemplate: row.email_body_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSettings() {
  const row = await queryOne<SettingsRow>("SELECT * FROM settings WHERE id = 1");

  if (!row) {
    throw new Error("No se pudo inicializar la configuración de Paylink.");
  }

  return mapSettingsRow(row);
}

export async function updateSettings(input: Omit<SettingsRecord, "createdAt" | "updatedAt">) {
  const current = await getSettings();
  const updatedAt = nowIso();
  const normalizedInput = { ...input, defaultCurrency: "EUR" };

  await execute(
    `UPDATE settings
     SET app_name = $1, merchant_display_name = $2, base_url = $3, default_currency = $4,
         allowed_payment_methods = $5, monei_api_key = $6, monei_account_id = $7,
         callback_path = $8, complete_url = $9, fail_url = $10, cancel_url = $11,
         smtp_host = $12, smtp_port = $13, smtp_secure = $14, smtp_user = $15,
         smtp_pass = $16, smtp_from = $17, smtp_from_name = $18,
         notification_default_email = $19, email_subject_template = $20,
         email_body_template = $21, updated_at = $22
     WHERE id = 1`,
    [
      normalizedInput.appName,
      normalizedInput.merchantDisplayName,
      normalizedInput.baseUrl,
      normalizedInput.defaultCurrency,
      JSON.stringify(normalizedInput.allowedPaymentMethods),
      normalizedInput.moneiApiKey,
      normalizedInput.moneiAccountId,
      normalizedInput.callbackPath,
      normalizedInput.completeUrl,
      normalizedInput.failUrl,
      normalizedInput.cancelUrl,
      normalizedInput.smtpHost,
      normalizedInput.smtpPort,
      normalizedInput.smtpSecure,
      normalizedInput.smtpUser,
      normalizedInput.smtpPass,
      normalizedInput.smtpFrom,
      normalizedInput.smtpFromName,
      normalizedInput.notificationDefaultEmail,
      normalizedInput.emailSubjectTemplate,
      normalizedInput.emailBodyTemplate,
      updatedAt,
    ],
  );

  return { ...current, ...normalizedInput, updatedAt };
}

export function getConfigurationWarnings(settings: SettingsRecord) {
  const warnings: string[] = [];

  if (!settings.baseUrl) {
    warnings.push("Configura `Base URL` para que MONEI pueda llamar al webhook y redirigir al cliente.");
  } else if (!isPublicBaseUrl(settings.baseUrl)) {
    warnings.push("La `Base URL` actual no es pública. Si usas `localhost` o `127.0.0.1`, MONEI no podrá llamar al webhook. Usa una URL pública o un túnel como ngrok/Cloudflare Tunnel.");
  }

  if (!settings.moneiApiKey) warnings.push("Falta la API key de MONEI; sin ella no se pueden crear links de pago.");
  if (!settings.notificationDefaultEmail) warnings.push("No hay email estándar configurado; el aviso se enviará solo al email específico del link si existe.");
  if (!settings.smtpHost || !settings.smtpFrom) warnings.push("La configuración SMTP está incompleta; los pagos se registrarán, pero no podrán enviar aviso por correo.");

  return warnings;
}
