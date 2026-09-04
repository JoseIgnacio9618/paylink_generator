import { NextRequest, NextResponse } from "next/server";
import { execute, initializeDatabase } from "@/lib/db";

const tables = {
  settings: [
    "id", "app_name", "merchant_display_name", "base_url", "default_currency", "allowed_payment_methods",
    "monei_api_key", "monei_account_id", "callback_path", "complete_url", "fail_url", "cancel_url",
    "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from", "smtp_from_name",
    "notification_default_email", "email_subject_template", "email_body_template", "created_at", "updated_at",
  ],
  paylinks: [
    "id", "owner_user_id", "order_id", "title", "description", "amount_cents", "currency", "recipient_email",
    "customer_name", "customer_email", "customer_phone", "allowed_payment_methods", "checkout_url",
    "monei_payment_id", "monei_status", "monei_status_code", "payment_url", "next_action_type", "last_payload",
    "notification_sent_at", "notification_recipients", "notification_error", "paid_at", "created_at", "updated_at",
  ],
  payment_events: ["id", "paylink_id", "monei_payment_id", "event_type", "payload", "created_at"],
  notification_jobs: [
    "id", "job_type", "paylink_id", "monei_payment_id", "payload", "attempts", "available_at", "locked_at",
    "sent_at", "last_error", "created_at", "updated_at",
  ],
  users: [
    "id", "username", "display_name", "password_hash", "role", "active", "admin_user_id", "can_view_admin_scope",
    "created_at", "updated_at",
  ],
  user_sessions: ["id", "user_id", "token_hash", "expires_at", "created_at"],
} as const;

type TableName = keyof typeof tables;
type MigrationPayload = {
  action?: "reset" | "finalize";
  rows?: Array<Record<string, unknown>>;
  table?: TableName;
};

function isAuthorized(request: NextRequest) {
  const token = process.env.MIGRATION_TOKEN;
  return Boolean(token) && request.headers.get("authorization") === `Bearer ${token}`;
}

function booleanValue(column: string, value: unknown) {
  if (column === "smtp_secure" || column === "active" || column === "can_view_admin_scope") {
    return Boolean(value);
  }

  return value;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await request.json() as MigrationPayload;
  await initializeDatabase();

  if (payload.action === "reset") {
    await execute("DELETE FROM user_sessions");
    await execute("DELETE FROM notification_jobs");
    await execute("DELETE FROM payment_events");
    await execute("DELETE FROM paylinks");
    await execute("DELETE FROM users");
    await execute("DELETE FROM settings");
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "finalize") {
    await execute(
      "SELECT setval(pg_get_serial_sequence('payment_events', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM payment_events), 1), 1), true)",
    );
    return NextResponse.json({ ok: true });
  }

  if (!payload.table || !(payload.table in tables) || !Array.isArray(payload.rows)) {
    return NextResponse.json({ error: "Carga de migración inválida" }, { status: 400 });
  }

  const columns = tables[payload.table];
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const statement = `INSERT INTO ${payload.table} (${columns.join(", ")}) VALUES (${placeholders})`;

  for (const row of payload.rows) {
    await execute(statement, columns.map((column) => booleanValue(column, row[column])));
  }

  return NextResponse.json({ ok: true, imported: payload.rows.length });
}
