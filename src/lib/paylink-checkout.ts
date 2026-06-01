import type { Payment } from "@monei-js/node-sdk";

const HOSTED_CHECKOUT_NEXT_ACTION_TYPES = new Set(["CONFIRM", "BIZUM_CHALLENGE"]);
const OPENABLE_PAYMENT_STATUSES = new Set(["PENDING", "PENDING_PROCESSING"]);
const NON_RECREATABLE_STATUSES = new Set([
  "SUCCEEDED",
  "AUTHORIZED",
  "PAID_OUT",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function isHostedCheckoutNextActionType(type: string | null | undefined) {
  return Boolean(type && HOSTED_CHECKOUT_NEXT_ACTION_TYPES.has(type));
}

export function getStableCheckoutUrl(payment: Pick<Payment, "nextAction"> | null | undefined) {
  const redirectUrl = payment?.nextAction?.redirectUrl ?? "";
  return isHostedCheckoutNextActionType(payment?.nextAction?.type) ? redirectUrl : "";
}

export function canOpenCheckout(input: { checkoutUrl: string; moneiStatus: string }) {
  return Boolean(input.checkoutUrl) && OPENABLE_PAYMENT_STATUSES.has(input.moneiStatus);
}

export function canRecreatePaylink(input: { checkoutUrl: string; moneiStatus: string }) {
  return !NON_RECREATABLE_STATUSES.has(input.moneiStatus) && !canOpenCheckout(input);
}

export function isPublicBaseUrl(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return !LOCALHOST_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}
