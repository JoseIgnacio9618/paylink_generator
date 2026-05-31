import { DEFAULT_PAYMENT_METHODS } from "@/lib/constants";
import type { SettingsRecord } from "@/lib/types";

function parseSecureFlag(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

function parseMethods(value: string | undefined) {
  if (!value) {
    return [...DEFAULT_PAYMENT_METHODS];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSeedSettings(): Omit<SettingsRecord, "createdAt" | "updatedAt"> {
  return {
    appName: process.env.APP_NAME ?? "Paylink Generator",
    merchantDisplayName:
      process.env.MERCHANT_DISPLAY_NAME ?? process.env.APP_NAME ?? "Paylink Generator",
    baseUrl: process.env.APP_BASE_URL ?? "",
    defaultCurrency: (process.env.DEFAULT_CURRENCY ?? "EUR").toUpperCase(),
    allowedPaymentMethods: parseMethods(process.env.DEFAULT_ALLOWED_PAYMENT_METHODS),
    moneiApiKey: process.env.MONEI_API_KEY ?? "",
    moneiAccountId: process.env.MONEI_ACCOUNT_ID ?? "",
    callbackPath: process.env.MONEI_CALLBACK_PATH ?? "/api/monei/webhook",
    completeUrl: process.env.MONEI_COMPLETE_URL ?? "",
    failUrl: process.env.MONEI_FAIL_URL ?? "",
    cancelUrl: process.env.MONEI_CANCEL_URL ?? "",
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: Number(process.env.SMTP_PORT ?? "587"),
    smtpSecure: parseSecureFlag(process.env.SMTP_SECURE),
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPass: process.env.SMTP_PASS ?? "",
    smtpFrom: process.env.SMTP_FROM ?? "",
    smtpFromName: process.env.SMTP_FROM_NAME ?? "Paylink Generator",
    notificationDefaultEmail: process.env.DEFAULT_NOTIFICATION_EMAIL ?? "",
    emailSubjectTemplate:
      process.env.EMAIL_SUBJECT_TEMPLATE ?? "Pago confirmado: {{title}}",
    emailBodyTemplate:
      process.env.EMAIL_BODY_TEMPLATE ??
      [
        "Se ha confirmado un pago.",
        "",
        "Título: {{title}}",
        "Descripción: {{description}}",
        "Precio: {{price}}",
        "Estado: {{status}}",
        "Cliente: {{customerName}}",
        "Email cliente: {{customerEmail}}",
        "Teléfono cliente: {{customerPhone}}",
        "Pedido: {{orderId}}",
        "ID MONEI: {{moneiPaymentId}}",
        "Link: {{paymentUrl}}",
      ].join("\n"),
  };
}

export function getSeedSuperadmin() {
  return {
    username: (process.env.SUPERADMIN_USERNAME ?? "admin").trim().toLowerCase(),
    displayName: (process.env.SUPERADMIN_DISPLAY_NAME ?? "Superadministrador").trim(),
    password: process.env.SUPERADMIN_PASSWORD ?? "admin12345",
  };
}
