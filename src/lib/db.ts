import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hashPassword } from "@/lib/auth-crypto";
import { getSeedSettings, getSeedSuperadmin } from "@/lib/env-defaults";
import { nowIso } from "@/lib/utils";

type QueryValue = unknown;

const globalForDatabase = globalThis as typeof globalThis & {
  __paylinkSql?: postgres.Sql;
  __paylinkDatabaseInitialization?: Promise<void>;
};

function getSql() {
  if (!globalForDatabase.__paylinkSql) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("Falta DATABASE_URL. Configura una base de datos PostgreSQL para Paylink.");
    }

    globalForDatabase.__paylinkSql = postgres(connectionString, {
      connect_timeout: 10,
      // Serverless page rendering must release idle sockets promptly. A long
      // timeout keeps the React server stream open and leaves the UI on its
      // navigation loading screen after authentication.
      idle_timeout: 1,
      max: 1,
      prepare: false,
    });
  }

  return globalForDatabase.__paylinkSql;
}

export async function query<T extends Record<string, unknown>>(
  statement: string,
  values: QueryValue[] = [],
) {
  await initializeDatabase();
  return getSql().unsafe<T[]>(statement, values as postgres.ParameterOrJSON<never>[]);
}

export async function queryOne<T extends Record<string, unknown>>(
  statement: string,
  values: QueryValue[] = [],
) {
  const rows = await query<T>(statement, values);
  return rows[0];
}

export async function execute(statement: string, values: QueryValue[] = []) {
  await initializeDatabase();
  const result = await getSql().unsafe(statement, values as postgres.ParameterOrJSON<never>[]);
  return { changes: result.count };
}

export async function initializeDatabase() {
  // The production schema is migrated before deployment. Running the complete
  // bootstrap DDL from every fresh Vercel function delays React's server
  // stream and leaves panel routes permanently in their loading boundary.
  // Keep automatic bootstrap for local development, or enable it explicitly
  // for a new empty environment.
  if (process.env.VERCEL && process.env.PAYLINK_AUTO_MIGRATE !== "true") {
    return;
  }

  if (!globalForDatabase.__paylinkDatabaseInitialization) {
    globalForDatabase.__paylinkDatabaseInitialization = initializeDatabaseOnce();
  }

  return globalForDatabase.__paylinkDatabaseInitialization;
}

async function initializeDatabaseOnce() {
  const sql = getSql();

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      app_name TEXT NOT NULL,
      merchant_display_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      default_currency TEXT NOT NULL,
      allowed_payment_methods TEXT NOT NULL,
      monei_api_key TEXT NOT NULL,
      monei_account_id TEXT NOT NULL,
      callback_path TEXT NOT NULL,
      complete_url TEXT NOT NULL,
      fail_url TEXT NOT NULL,
      cancel_url TEXT NOT NULL,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER NOT NULL,
      smtp_secure BOOLEAN NOT NULL,
      smtp_user TEXT NOT NULL,
      smtp_pass TEXT NOT NULL,
      smtp_from TEXT NOT NULL,
      smtp_from_name TEXT NOT NULL,
      notification_default_email TEXT NOT NULL,
      email_subject_template TEXT NOT NULL,
      email_body_template TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paylinks (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT '',
      order_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      allowed_payment_methods TEXT NOT NULL,
      checkout_url TEXT NOT NULL DEFAULT '',
      monei_payment_id TEXT NOT NULL UNIQUE,
      monei_status TEXT NOT NULL,
      monei_status_code TEXT NOT NULL,
      payment_url TEXT NOT NULL,
      next_action_type TEXT NOT NULL,
      last_payload TEXT NOT NULL,
      notification_sent_at TEXT NOT NULL,
      notification_recipients TEXT NOT NULL,
      notification_error TEXT NOT NULL,
      paid_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_events (
      id BIGSERIAL PRIMARY KEY,
      paylink_id TEXT NOT NULL,
      monei_payment_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_jobs (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      paylink_id TEXT NOT NULL,
      monei_payment_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at TEXT NOT NULL,
      locked_at TEXT NOT NULL DEFAULT '',
      sent_at TEXT NOT NULL DEFAULT '',
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (paylink_id, job_type)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      active BOOLEAN NOT NULL,
      admin_user_id TEXT NOT NULL DEFAULT '',
      can_view_admin_scope BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS notification_jobs_pending_idx
      ON notification_jobs (available_at, created_at)
      WHERE sent_at = '';
  `);

  const existingSettings = await sql.unsafe<Array<{ id: number }>>(
    "SELECT id FROM settings WHERE id = 1",
  );

  if (existingSettings.length === 0) {
    const settings = getSeedSettings();
    const now = nowIso();

    await sql.unsafe(
      `INSERT INTO settings (
        id, app_name, merchant_display_name, base_url, default_currency, allowed_payment_methods,
        monei_api_key, monei_account_id, callback_path, complete_url,
        fail_url, cancel_url, smtp_host, smtp_port, smtp_secure, smtp_user,
        smtp_pass, smtp_from, smtp_from_name, notification_default_email,
        email_subject_template, email_body_template, created_at, updated_at
      ) VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23
      )`,
      [
        settings.appName,
        settings.merchantDisplayName,
        settings.baseUrl,
        settings.defaultCurrency,
        JSON.stringify(settings.allowedPaymentMethods),
        settings.moneiApiKey,
        settings.moneiAccountId,
        settings.callbackPath,
        settings.completeUrl,
        settings.failUrl,
        settings.cancelUrl,
        settings.smtpHost,
        settings.smtpPort,
        settings.smtpSecure,
        settings.smtpUser,
        settings.smtpPass,
        settings.smtpFrom,
        settings.smtpFromName,
        settings.notificationDefaultEmail,
        settings.emailSubjectTemplate,
        settings.emailBodyTemplate,
        now,
        now,
      ],
    );
  }

  const existingSuperadmin = await sql.unsafe<Array<{ id: string }>>(
    "SELECT id FROM users WHERE role = 'superadmin' LIMIT 1",
  );

  if (existingSuperadmin.length === 0) {
    const seed = getSeedSuperadmin();
    const now = nowIso();
    await sql.unsafe(
      `INSERT INTO users (
        id, username, display_name, password_hash, role, active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'superadmin', TRUE, $5, $6)`,
      [randomUUID(), seed.username, seed.displayName || "Superadministrador", hashPassword(seed.password), now, now],
    );
  }
}
