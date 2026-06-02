import type { Payment } from "@monei-js/node-sdk";
import { db } from "@/lib/db";
import { getStableCheckoutUrl } from "@/lib/paylink-checkout";
import type { PaginatedPaylinksResult, PaylinkRecord } from "@/lib/types";
import { nowIso, parseJsonArray } from "@/lib/utils";

type PaylinkRow = {
  id: string;
  owner_user_id: string;
  owner_display_name: string;
  owner_username: string;
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
  checkout_url: string;
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

const PAYLINK_SELECT_FIELDS = `
  paylinks.*,
  COALESCE(users.display_name, '') as owner_display_name,
  COALESCE(users.username, '') as owner_username
`;

const PAYLINK_FROM_CLAUSE = `
  FROM paylinks
  LEFT JOIN users ON users.id = paylinks.owner_user_id
`;

const PAYLINK_SEARCH_COLUMNS = [
  "paylinks.id",
  "paylinks.order_id",
  "paylinks.title",
  "paylinks.description",
  "paylinks.currency",
  "paylinks.recipient_email",
  "paylinks.customer_name",
  "paylinks.customer_email",
  "paylinks.customer_phone",
  "paylinks.allowed_payment_methods",
  "paylinks.checkout_url",
  "paylinks.monei_payment_id",
  "paylinks.monei_status",
  "paylinks.monei_status_code",
  "paylinks.payment_url",
  "paylinks.next_action_type",
  "paylinks.last_payload",
  "paylinks.notification_sent_at",
  "paylinks.notification_recipients",
  "paylinks.notification_error",
  "paylinks.paid_at",
  "paylinks.created_at",
  "paylinks.updated_at",
  "users.display_name",
  "users.username",
  "CAST(paylinks.amount_cents AS TEXT)",
  "printf('%.2f', paylinks.amount_cents / 100.0)",
] as const;

function normalizePhoneSearchValue(value: string) {
  return value.replace(/[\s()+-]/g, "");
}

function mapPaylinkRow(row: PaylinkRow): PaylinkRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerDisplayName: row.owner_display_name,
    ownerUsername: row.owner_username,
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
    checkoutUrl: row.checkout_url,
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

function buildOwnerScopeCondition(ownerUserIds?: string[]) {
  if (!ownerUserIds) {
    return { clause: "", params: [] as string[] };
  }

  if (ownerUserIds.length === 0) {
    return { clause: "WHERE 1 = 0", params: [] as string[] };
  }

  return {
    clause: `WHERE paylinks.owner_user_id IN (${ownerUserIds.map(() => "?").join(", ")})`,
    params: ownerUserIds,
  };
}

export function listPaylinks(input?: { ownerUserIds?: string[] }) {
  const { clause, params } = buildOwnerScopeCondition(input?.ownerUserIds);
  const rows = db
    .prepare(`
      SELECT ${PAYLINK_SELECT_FIELDS}
      ${PAYLINK_FROM_CLAUSE}
      ${clause}
      ORDER BY datetime(paylinks.created_at) DESC
    `)
    .all(...params) as PaylinkRow[];

  return rows.map(mapPaylinkRow);
}

export function searchPaylinks(input: {
  query?: string;
  page?: number;
  pageSize?: number;
  ownerUserIds?: string[];
}): PaginatedPaylinksResult {
  const query = (input.query ?? "").trim();
  const pageSize = clampPageSize(input.pageSize ?? 25);
  const requestedPage = Math.max(1, Math.trunc(input.page ?? 1));
  const { whereClause, params } = buildPaylinkSearch(query, input.ownerUserIds);

  const totalRow = db
    .prepare(`
      SELECT COUNT(*) as total
      ${PAYLINK_FROM_CLAUSE}
      ${whereClause}
    `)
    .get(...params) as { total: number };
  const total = totalRow.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(`
      SELECT ${PAYLINK_SELECT_FIELDS}
      ${PAYLINK_FROM_CLAUSE}
      ${whereClause}
      ORDER BY datetime(paylinks.created_at) DESC
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

export function getPaylinkById(id: string, ownerUserIds?: string[]) {
  const params = [id];
  let whereClause = "WHERE paylinks.id = ?";

  if (ownerUserIds) {
    if (ownerUserIds.length === 0) {
      return null;
    }

    whereClause += ` AND paylinks.owner_user_id IN (${ownerUserIds.map(() => "?").join(", ")})`;
    params.push(...ownerUserIds);
  }

  const row = db
    .prepare(`
      SELECT ${PAYLINK_SELECT_FIELDS}
      ${PAYLINK_FROM_CLAUSE}
      ${whereClause}
      LIMIT 1
    `)
    .get(...params) as PaylinkRow | undefined;

  return row ? mapPaylinkRow(row) : null;
}

export function getPaylinkByMoneiPaymentId(moneiPaymentId: string) {
  const row = db
    .prepare(`
      SELECT ${PAYLINK_SELECT_FIELDS}
      ${PAYLINK_FROM_CLAUSE}
      WHERE paylinks.monei_payment_id = ?
      LIMIT 1
    `)
    .get(moneiPaymentId) as PaylinkRow | undefined;
  return row ? mapPaylinkRow(row) : null;
}

export function insertPaylink(input: {
  id: string;
  ownerUserId: string;
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
      id, owner_user_id, order_id, title, description, amount_cents, currency, recipient_email,
      customer_name, customer_email, customer_phone, allowed_payment_methods, checkout_url,
      monei_payment_id, monei_status, monei_status_code, payment_url,
      next_action_type, last_payload, notification_sent_at,
      notification_recipients, notification_error, paid_at, created_at, updated_at
    )
    VALUES (
      @id, @ownerUserId, @orderId, @title, @description, @amountCents, @currency, @recipientEmail,
      @customerName, @customerEmail, @customerPhone, @allowedPaymentMethods, @checkoutUrl,
      @moneiPaymentId, @moneiStatus, @moneiStatusCode, @paymentUrl, @nextActionType,
      @lastPayload, '', '[]', '', @paidAt, @createdAt, @updatedAt
    )
  `).run({
    id: input.id,
    ownerUserId: input.ownerUserId,
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
    checkoutUrl: getStableCheckoutUrl(input.payment),
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
  const paidAt = payment.status === "SUCCEEDED" ? existing.paidAt || now : existing.paidAt;
  const checkoutUrl = getStableCheckoutUrl(payment) || existing.checkoutUrl;

  db.prepare(`
    UPDATE paylinks
    SET
      checkout_url = @checkoutUrl,
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
    checkoutUrl,
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

function buildPaylinkSearch(query: string, ownerUserIds?: string[]) {
  const ownerScope = buildOwnerScopeCondition(ownerUserIds);

  if (!query) {
    return {
      whereClause: ownerScope.clause,
      params: ownerScope.params,
    };
  }

  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  ];
  const params = [...ownerScope.params];
  const prefixConditions = ownerScope.clause
    ? [ownerScope.clause.replace(/^WHERE /, "")]
    : [];

  const groups = terms.map((term) => {
    const like = `%${term}%`;
    const normalizedPhoneTerm = normalizePhoneSearchValue(term);
    const conditions = PAYLINK_SEARCH_COLUMNS.map((column) => {
      params.push(like);
      return `LOWER(COALESCE(${column}, '')) LIKE ?`;
    });

    if (normalizedPhoneTerm) {
      params.push(`%${normalizedPhoneTerm}%`);
      conditions.push(
        "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(paylinks.customer_phone, ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', '') LIKE ?",
      );
    }

    return `(${conditions.join(" OR ")})`;
  });

  return {
    whereClause: `WHERE ${[...prefixConditions, ...groups].join(" AND ")}`,
    params,
  };
}

function clampPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) {
    return 25;
  }

  return Math.min(100, Math.max(10, Math.trunc(pageSize)));
}
