import { clsx } from "clsx";
import { SUPPORTED_PAYMENT_METHODS } from "@/lib/constants";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function nowIso() {
  return new Date().toISOString();
}

export function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function trimToEmpty(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function amountToCents(value: string | number) {
  const normalized = String(value).replace(",", ".").trim();

  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number(normalized) * 100);
}

export function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function toAbsoluteUrl(baseUrl: string, value: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).toString();
  } catch {
    return new URL(value, baseUrl).toString();
  }
}

export function generateOrderId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PL-${date}-${suffix}`;
}

export function uniqueEmails(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim().toLowerCase()).filter(Boolean))] as string[];
}

export function renderTemplate(template: string, context: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => context[key] ?? "");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Tarjeta",
  cardPresent: "Tarjeta presencial (POS)",
  bizum: "Bizum",
  paypal: "PayPal",
  mbway: "MB WAY",
  multibanco: "Multibanco",
  iDeal: "iDEAL",
  bancontact: "Bancontact",
  sofort: "Sofort",
  trustly: "Trustly",
  sepa: "SEPA",
  klarna: "Klarna",
  giropay: "Giropay",
  eps: "EPS",
  blik: "BLIK",
  alipay: "Alipay",
  googlePay: "Google Pay",
  applePay: "Apple Pay",
  clickToPay: "Click to Pay",
  srtp: "SEPA Request to Pay",
};

export function formatPaymentMethodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function formatPaymentMethodList(methods: string[]) {
  return methods.map(formatPaymentMethodLabel).join(", ");
}

export function filterSupportedPaymentMethods(methods: string[]) {
  const supported = new Set<string>(SUPPORTED_PAYMENT_METHODS);
  return methods.filter((method) => supported.has(method));
}
