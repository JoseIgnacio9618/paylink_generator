import { db } from "@/lib/db";
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
  smtp_secure: number;
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
    smtpSecure: Boolean(row.smtp_secure),
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

export function getSettings() {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
  return mapSettingsRow(row);
}

export function updateSettings(input: Omit<SettingsRecord, "createdAt" | "updatedAt">) {
  const current = getSettings();
  const updatedAt = nowIso();
  const normalizedInput = {
    ...input,
    defaultCurrency: "EUR",
  };

  db.prepare(`
    UPDATE settings
    SET
      app_name = @appName,
      merchant_display_name = @merchantDisplayName,
      base_url = @baseUrl,
      default_currency = @defaultCurrency,
      allowed_payment_methods = @allowedPaymentMethods,
      monei_api_key = @moneiApiKey,
      monei_account_id = @moneiAccountId,
      callback_path = @callbackPath,
      complete_url = @completeUrl,
      fail_url = @failUrl,
      cancel_url = @cancelUrl,
      smtp_host = @smtpHost,
      smtp_port = @smtpPort,
      smtp_secure = @smtpSecure,
      smtp_user = @smtpUser,
      smtp_pass = @smtpPass,
      smtp_from = @smtpFrom,
      smtp_from_name = @smtpFromName,
      notification_default_email = @notificationDefaultEmail,
      email_subject_template = @emailSubjectTemplate,
      email_body_template = @emailBodyTemplate,
      updated_at = @updatedAt
    WHERE id = 1
  `).run({
    ...normalizedInput,
    allowedPaymentMethods: JSON.stringify(normalizedInput.allowedPaymentMethods),
    smtpSecure: normalizedInput.smtpSecure ? 1 : 0,
    updatedAt,
  });

  return {
    ...current,
    ...normalizedInput,
    updatedAt,
  };
}

export function getConfigurationWarnings(settings: SettingsRecord) {
  const warnings: string[] = [];

  if (!settings.baseUrl) {
    warnings.push("Configura `Base URL` para que MONEI pueda llamar al webhook y redirigir al cliente.");
  } else if (!isPublicBaseUrl(settings.baseUrl)) {
    warnings.push("La `Base URL` actual no es pública. Si usas `localhost` o `127.0.0.1`, MONEI no podrá llamar al webhook. Usa una URL pública o un túnel como ngrok/Cloudflare Tunnel.");
  }

  if (!settings.moneiApiKey) {
    warnings.push("Falta la API key de MONEI; sin ella no se pueden crear ni sincronizar pagos.");
  }

  if (!settings.notificationDefaultEmail) {
    warnings.push("No hay email estándar configurado; el aviso se enviará solo al email específico del link si existe.");
  }

  if (!settings.smtpHost || !settings.smtpFrom) {
    warnings.push("La configuración SMTP está incompleta; los pagos se registrarán, pero no podrán enviar aviso por correo.");
  }

  return warnings;
}
