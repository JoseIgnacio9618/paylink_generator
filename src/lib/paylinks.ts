import type { Payment } from "@monei-js/node-sdk";
import { execute, query, queryOne } from "@/lib/db";
import { getStableCheckoutUrl } from "@/lib/paylink-checkout";
import type { PaginatedPaylinksResult, PaylinkRecord } from "@/lib/types";
import { nowIso, parseJsonArray } from "@/lib/utils";

type PaylinkRow = {
  id: string; owner_user_id: string; owner_display_name: string; owner_username: string;
  order_id: string; title: string; description: string; amount_cents: number; currency: string;
  recipient_email: string; customer_name: string; customer_email: string; customer_phone: string;
  allowed_payment_methods: string; checkout_url: string; monei_payment_id: string; monei_status: string;
  monei_status_code: string; payment_url: string; next_action_type: string; last_payload: string;
  notification_sent_at: string; notification_recipients: string; notification_error: string;
  paid_at: string; created_at: string; updated_at: string;
};

const PAYLINK_SELECT_FIELDS = `
  paylinks.*, COALESCE(users.display_name, '') AS owner_display_name,
  COALESCE(users.username, '') AS owner_username
`;
const PAYLINK_FROM_CLAUSE = "FROM paylinks LEFT JOIN users ON users.id = paylinks.owner_user_id";
const PAYLINK_SEARCH_COLUMNS = [
  "paylinks.id", "paylinks.order_id", "paylinks.title", "paylinks.description", "paylinks.currency",
  "paylinks.recipient_email", "paylinks.customer_name", "paylinks.customer_email", "paylinks.customer_phone",
  "paylinks.allowed_payment_methods", "paylinks.checkout_url", "paylinks.monei_payment_id",
  "paylinks.monei_status", "paylinks.monei_status_code", "paylinks.payment_url", "paylinks.next_action_type",
  "paylinks.last_payload", "paylinks.notification_sent_at", "paylinks.notification_recipients",
  "paylinks.notification_error", "paylinks.paid_at", "paylinks.created_at", "paylinks.updated_at",
  "users.display_name", "users.username", "paylinks.amount_cents::text",
] as const;

function mapPaylinkRow(row: PaylinkRow): PaylinkRecord {
  let refundedAmountCents = 0;
  try {
    const value = JSON.parse(row.last_payload) as { refundedAmount?: unknown };
    refundedAmountCents = typeof value.refundedAmount === "number" && value.refundedAmount > 0 ? value.refundedAmount : 0;
  } catch {}

  return {
    id: row.id, ownerUserId: row.owner_user_id, ownerDisplayName: row.owner_display_name,
    ownerUsername: row.owner_username, orderId: row.order_id, title: row.title,
    description: row.description, amountCents: row.amount_cents, currency: row.currency,
    recipientEmail: row.recipient_email, customerName: row.customer_name,
    customerEmail: row.customer_email, customerPhone: row.customer_phone,
    allowedPaymentMethods: parseJsonArray(row.allowed_payment_methods), checkoutUrl: row.checkout_url,
    moneiPaymentId: row.monei_payment_id, moneiStatus: row.monei_status,
    moneiStatusCode: row.monei_status_code, paymentUrl: row.payment_url,
    nextActionType: row.next_action_type, lastPayload: row.last_payload,
    refundedAmountCents, refundableAmountCents: Math.max(0, row.amount_cents - refundedAmountCents),
    notificationSentAt: row.notification_sent_at,
    notificationRecipients: parseJsonArray(row.notification_recipients), notificationError: row.notification_error,
    paidAt: row.paid_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function buildOwnerScopeCondition(ownerUserIds?: string[], parameterIndex = 1) {
  if (!ownerUserIds) return { clause: "", params: [] as unknown[] };
  if (ownerUserIds.length === 0) return { clause: "WHERE FALSE", params: [] as unknown[] };
  return { clause: `WHERE paylinks.owner_user_id = ANY($${parameterIndex}::text[])`, params: [ownerUserIds] as unknown[] };
}

export async function listPaylinks(input?: { ownerUserIds?: string[] }) {
  const scope = buildOwnerScopeCondition(input?.ownerUserIds);
  const rows = await query<PaylinkRow>(`
    SELECT ${PAYLINK_SELECT_FIELDS} ${PAYLINK_FROM_CLAUSE} ${scope.clause}
    ORDER BY paylinks.created_at DESC
  `, scope.params);
  return rows.map(mapPaylinkRow);
}

export async function searchPaylinks(input: {
  query?: string; page?: number; pageSize?: number; ownerUserIds?: string[];
}): Promise<PaginatedPaylinksResult> {
  const pageSize = clampPageSize(input.pageSize ?? 25);
  const requestedPage = Math.max(1, Math.trunc(input.page ?? 1));
  const search = buildPaylinkSearch((input.query ?? "").trim(), input.ownerUserIds);
  const total = (await queryOne<{ total: number }>(`
    SELECT COUNT(*)::int AS total ${PAYLINK_FROM_CLAUSE} ${search.whereClause}
  `, search.params))?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const rows = await query<PaylinkRow>(`
    SELECT ${PAYLINK_SELECT_FIELDS} ${PAYLINK_FROM_CLAUSE} ${search.whereClause}
    ORDER BY paylinks.created_at DESC LIMIT $${search.params.length + 1} OFFSET $${search.params.length + 2}
  `, [...search.params, pageSize, offset]);
  return { items: rows.map(mapPaylinkRow), total, page, pageSize, totalPages, query: (input.query ?? "").trim() };
}

export async function getPaylinkById(id: string, ownerUserIds?: string[]) {
  const params: unknown[] = [id];
  let whereClause = "WHERE paylinks.id = $1";
  if (ownerUserIds) {
    if (ownerUserIds.length === 0) return null;
    whereClause += " AND paylinks.owner_user_id = ANY($2::text[])";
    params.push(ownerUserIds);
  }
  const row = await queryOne<PaylinkRow>(`
    SELECT ${PAYLINK_SELECT_FIELDS} ${PAYLINK_FROM_CLAUSE} ${whereClause} LIMIT 1
  `, params);
  return row ? mapPaylinkRow(row) : null;
}

export async function getPaylinkByMoneiPaymentId(moneiPaymentId: string) {
  const row = await queryOne<PaylinkRow>(`
    SELECT ${PAYLINK_SELECT_FIELDS} ${PAYLINK_FROM_CLAUSE}
    WHERE paylinks.monei_payment_id = $1 LIMIT 1
  `, [moneiPaymentId]);
  return row ? mapPaylinkRow(row) : null;
}

export async function insertPaylink(input: {
  id: string; ownerUserId: string; orderId: string; title: string; description: string;
  amountCents: number; currency: string; recipientEmail: string; customerName: string;
  customerEmail: string; customerPhone: string; allowedPaymentMethods: string[]; payment: Payment;
}) {
  const now = nowIso();
  await execute(
    `INSERT INTO paylinks (
      id, owner_user_id, order_id, title, description, amount_cents, currency, recipient_email,
      customer_name, customer_email, customer_phone, allowed_payment_methods, checkout_url,
      monei_payment_id, monei_status, monei_status_code, payment_url, next_action_type,
      last_payload, notification_sent_at, notification_recipients, notification_error, paid_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, '', '[]', '', $20, $21, $22
    )`,
    [
      input.id, input.ownerUserId, input.orderId, input.title, input.description, input.amountCents,
      input.currency, input.recipientEmail, input.customerName, input.customerEmail, input.customerPhone,
      JSON.stringify(input.allowedPaymentMethods), getStableCheckoutUrl(input.payment), input.payment.id,
      input.payment.status ?? "PENDING", input.payment.statusCode ?? "", input.payment.nextAction?.redirectUrl ?? "",
      input.payment.nextAction?.type ?? "", JSON.stringify(input.payment), input.payment.status === "SUCCEEDED" ? now : "", now, now,
    ],
  );
  await recordPaymentEvent(input.id, input.payment.id, "created", input.payment);
  const paylink = await getPaylinkById(input.id);
  if (!paylink) throw new Error("No se pudo guardar el link de pago.");
  return paylink;
}

export async function recordPaymentEvent(paylinkId: string, moneiPaymentId: string, eventType: string, payload: unknown) {
  await execute(
    "INSERT INTO payment_events (paylink_id, monei_payment_id, event_type, payload, created_at) VALUES ($1, $2, $3, $4, $5)",
    [paylinkId, moneiPaymentId, eventType, JSON.stringify(payload), nowIso()],
  );
}

export async function applyPaymentUpdate(paylinkId: string, payment: Payment, eventType: string) {
  const existing = await getPaylinkById(paylinkId);
  if (!existing) throw new Error("Paylink no encontrado para actualizar.");
  const now = nowIso();
  await execute(
    `UPDATE paylinks SET checkout_url = $1, monei_status = $2, monei_status_code = $3,
      payment_url = $4, next_action_type = $5, last_payload = $6, paid_at = $7, updated_at = $8 WHERE id = $9`,
    [
      getStableCheckoutUrl(payment) || existing.checkoutUrl, payment.status ?? existing.moneiStatus,
      payment.statusCode ?? existing.moneiStatusCode, payment.nextAction?.redirectUrl ?? existing.paymentUrl,
      payment.nextAction?.type ?? existing.nextActionType, JSON.stringify(payment),
      payment.status === "SUCCEEDED" ? existing.paidAt || now : existing.paidAt, now, paylinkId,
    ],
  );
  await recordPaymentEvent(paylinkId, existing.moneiPaymentId, eventType, payment);
  const updated = await getPaylinkById(paylinkId);
  if (!updated) throw new Error("No se pudo actualizar el link de pago.");
  return updated;
}

export async function markNotificationResult(paylinkId: string, result: { sentAt?: string; recipients?: string[]; error?: string }) {
  await execute(
    `UPDATE paylinks SET notification_sent_at = $1, notification_recipients = $2,
      notification_error = $3, updated_at = $4 WHERE id = $5`,
    [result.sentAt ?? "", JSON.stringify(result.recipients ?? []), result.error ?? "", nowIso(), paylinkId],
  );
  const paylink = await getPaylinkById(paylinkId);
  if (!paylink) throw new Error("Paylink no encontrado.");
  return paylink;
}

function buildPaylinkSearch(queryValue: string, ownerUserIds?: string[]) {
  const scope = buildOwnerScopeCondition(ownerUserIds);
  if (!queryValue) return { whereClause: scope.clause, params: scope.params };
  const params = [...scope.params] as unknown[];
  const prefix = scope.clause ? [scope.clause.replace(/^WHERE /, "")] : [];
  const groups = [...new Set(queryValue.toLowerCase().split(/\s+/).filter(Boolean))].map((term) => {
    const like = `%${term}%`;
    const conditions = PAYLINK_SEARCH_COLUMNS.map((column) => {
      params.push(like);
      return `LOWER(COALESCE(${column}, '')) LIKE $${params.length}`;
    });
    const phoneTerm = term.replace(/[\s()+-]/g, "");
    if (phoneTerm) {
      params.push(`%${phoneTerm}%`);
      conditions.push(`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(paylinks.customer_phone, ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE $${params.length}`);
    }
    return `(${conditions.join(" OR ")})`;
  });
  return { whereClause: `WHERE ${[...prefix, ...groups].join(" AND ")}`, params };
}

function clampPageSize(pageSize: number) {
  return Number.isFinite(pageSize) ? Math.min(100, Math.max(10, Math.trunc(pageSize))) : 25;
}
