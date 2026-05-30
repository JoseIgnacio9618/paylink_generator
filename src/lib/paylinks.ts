import type { Payment } from "@monei-js/node-sdk";
import { db } from "@/lib/db";
import type { PaginatedPaylinksResult, PaylinkRecord } from "@/lib/types";
import { nowIso, parseJsonArray } from "@/lib/utils";

type PaylinkRow = {
  id: string;
  order_id: string;
  title: string;
  description: string;
  amount_cents: number;
  currency: string;
  recipient_email: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  allowed_payment_methods: string;
  monei_payment_id: string;
  monei_status: string;
  monei_status_code: string;
  payment_url: string;
  next_action_type: string;
  last_payload: string;
  notification_sent_at: string;
  notification_recipients: string;
  notification_error: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
};

const PAYLINK_SEARCH_COLUMNS = [
  "id",
  "order_id",
  "title",
  "description",
  "currency",
  "recipient_email",
  "customer_name",
  "customer_email",
  "customer_phone",
  "allowed_payment_methods",
  "monei_payment_id",
  "monei_status",
  "monei_status_code",
  "payment_url",
  "next_action_type",
  "last_payload",
  "notification_sent_at",
  "notification_recipients",
  "notification_error",
  "paid_at",
  "created_at",
  "updated_at",
  "CAST(amount_cents AS TEXT)",
  "printf('%.2f', amount_cents / 100.0)",
] as const;

function mapPaylinkRow(row: PaylinkRow): PaylinkRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    title: row.title,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    recipientEmail: row.recipient_email,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    allowedPaymentMethods: parseJsonArray(row.allowed_payment_methods),
    moneiPaymentId: row.monei_payment_id,
    moneiStatus: row.monei_status,
    moneiStatusCode: row.monei_status_code,
    paymentUrl: row.payment_url,
    nextActionType: row.next_action_type,
    lastPayload: row.last_payload,
    notificationSentAt: row.notification_sent_at,
    notificationRecipients: parseJsonArray(row.notification_recipients),
    notificationError: row.notification_error,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listPaylinks() {
  const rows = db
    .prepare("SELECT * FROM paylinks ORDER BY datetime(created_at) DESC")
    .all() as PaylinkRow[];
  return rows.map(mapPaylinkRow);
}

export function searchPaylinks(input: {
  query?: string;
  page?: number;
  pageSize?: number;
}): PaginatedPaylinksResult {
  const query = (input.query ?? "").trim();
  const pageSize = clampPageSize(input.pageSize ?? 25);
  const requestedPage = Math.max(1, Math.trunc(input.page ?? 1));
  const { whereClause, params } = buildPaylinkSearch(query);

  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM paylinks ${whereClause}`)
    .get(...params) as { total: number };
  const total = totalRow.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(`
      SELECT *
      FROM paylinks
      ${whereClause}
      ORDER BY datetime(created_at) DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, pageSize, offset) as PaylinkRow[];

  return {
    items: rows.map(mapPaylinkRow),
    total,
    page,
    pageSize,
    totalPages,
    query,
  };
}

export function getPaylinkById(id: string) {
  const row = db.prepare("SELECT * FROM paylinks WHERE id = ?").get(id) as
    | PaylinkRow
    | undefined;
  return row ? mapPaylinkRow(row) : null;
}

export function getPaylinkByMoneiPaymentId(moneiPaymentId: string) {
  const row = db.prepare("SELECT * FROM paylinks WHERE monei_payment_id = ?").get(
    moneiPaymentId,
  ) as PaylinkRow | undefined;
  return row ? mapPaylinkRow(row) : null;
}

export function insertPaylink(input: {
  id: string;
  orderId: string;
  title: string;
  description: string;
  amountCents: number;
  currency: string;
  recipientEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  allowedPaymentMethods: string[];
  payment: Payment;
}) {
  const now = nowIso();

  db.prepare(`
    INSERT INTO paylinks (
      id, order_id, title, description, amount_cents, currency, recipient_email,
      customer_name, customer_email, customer_phone, allowed_payment_methods,
      monei_payment_id, monei_status, monei_status_code, payment_url,
      next_action_type, last_payload, notification_sent_at,
      notification_recipients, notification_error, paid_at, created_at, updated_at
    )
    VALUES (
      @id, @orderId, @title, @description, @amountCents, @currency, @recipientEmail,
      @customerName, @customerEmail, @customerPhone, @allowedPaymentMethods,
      @moneiPaymentId, @moneiStatus, @moneiStatusCode, @paymentUrl, @nextActionType,
      @lastPayload, '', '[]', '', @paidAt, @createdAt, @updatedAt
    )
  `).run({
    id: input.id,
    orderId: input.orderId,
    title: input.title,
    description: input.description,
    amountCents: input.amountCents,
    currency: input.currency,
    recipientEmail: input.recipientEmail,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    allowedPaymentMethods: JSON.stringify(input.allowedPaymentMethods),
    moneiPaymentId: input.payment.id,
    moneiStatus: input.payment.status ?? "PENDING",
    moneiStatusCode: input.payment.statusCode ?? "",
    paymentUrl: input.payment.nextAction?.redirectUrl ?? "",
    nextActionType: input.payment.nextAction?.type ?? "",
    lastPayload: JSON.stringify(input.payment),
    paidAt: input.payment.status === "SUCCEEDED" ? now : "",
    createdAt: now,
    updatedAt: now,
  });

  recordPaymentEvent(input.id, input.payment.id, "created", input.payment);
  return getPaylinkById(input.id)!;
}

export function recordPaymentEvent(
  paylinkId: string,
  moneiPaymentId: string,
  eventType: string,
  payload: unknown,
) {
  db.prepare(`
    INSERT INTO payment_events (
      paylink_id, monei_payment_id, event_type, payload, created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(paylinkId, moneiPaymentId, eventType, JSON.stringify(payload), nowIso());
}

export function applyPaymentUpdate(
  paylinkId: string,
  payment: Payment,
  eventType: string,
) {
  const existing = getPaylinkById(paylinkId);

  if (!existing) {
    throw new Error("Paylink no encontrado para actualizar.");
  }

  const now = nowIso();
  const paidAt =
    payment.status === "SUCCEEDED" ? existing.paidAt || now : existing.paidAt;

  db.prepare(`
    UPDATE paylinks
    SET
      monei_status = @moneiStatus,
      monei_status_code = @moneiStatusCode,
      payment_url = @paymentUrl,
      next_action_type = @nextActionType,
      last_payload = @lastPayload,
      paid_at = @paidAt,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: paylinkId,
    moneiStatus: payment.status ?? existing.moneiStatus,
    moneiStatusCode: payment.statusCode ?? existing.moneiStatusCode,
    paymentUrl: payment.nextAction?.redirectUrl ?? existing.paymentUrl,
    nextActionType: payment.nextAction?.type ?? existing.nextActionType,
    lastPayload: JSON.stringify(payment),
    paidAt,
    updatedAt: now,
  });

  recordPaymentEvent(paylinkId, existing.moneiPaymentId, eventType, payment);
  return getPaylinkById(paylinkId)!;
}

export function markNotificationResult(
  paylinkId: string,
  result: { sentAt?: string; recipients?: string[]; error?: string },
) {
  db.prepare(`
    UPDATE paylinks
    SET
      notification_sent_at = @notificationSentAt,
      notification_recipients = @notificationRecipients,
      notification_error = @notificationError,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: paylinkId,
    notificationSentAt: result.sentAt ?? "",
    notificationRecipients: JSON.stringify(result.recipients ?? []),
    notificationError: result.error ?? "",
    updatedAt: nowIso(),
  });

  return getPaylinkById(paylinkId)!;
}

function buildPaylinkSearch(query: string) {
  if (!query) {
    return { whereClause: "", params: [] as string[] };
  }

  const terms = [...new Set(query.toLowerCase().split(/\s+/).map((term) => term.trim()).filter(Boolean))];
  const params: string[] = [];
  const groups = terms.map((term) => {
    const like = `%${term}%`;
    const conditions = PAYLINK_SEARCH_COLUMNS.map((column) => {
      params.push(like);
      return `LOWER(COALESCE(${column}, '')) LIKE ?`;
    });
    return `(${conditions.join(" OR ")})`;
  });

  return {
    whereClause: `WHERE ${groups.join(" AND ")}`,
    params,
  };
}

function clampPageSize(value: number) {
  const normalized = Math.trunc(value);

  if (normalized <= 10) {
    return 10;
  }

  if (normalized <= 25) {
    return 25;
  }

  if (normalized <= 50) {
    return 50;
  }

  return 100;
}
