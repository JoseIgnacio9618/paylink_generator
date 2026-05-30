import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getSeedSettings } from "@/lib/env-defaults";
import { nowIso } from "@/lib/utils";

type SQLiteDatabase = Database.Database;

const globalForDatabase = globalThis as typeof globalThis & {
  __paylinkDb?: SQLiteDatabase;
};

function createDatabase() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, "paylink.sqlite"));
  db.pragma("journal_mode = WAL");

  db.exec(`
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
      smtp_secure INTEGER NOT NULL,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paylink_id TEXT NOT NULL,
      monei_payment_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const settingsColumns = (
    db.prepare("PRAGMA table_info(settings)").all() as Array<{ name: string }>
  ).map((column) => column.name);

  if (!settingsColumns.includes("merchant_display_name")) {
    db.exec("ALTER TABLE settings ADD COLUMN merchant_display_name TEXT NOT NULL DEFAULT ''");
    db.exec("UPDATE settings SET merchant_display_name = app_name WHERE merchant_display_name = ''");
  }

  const seed = getSeedSettings();
  const now = nowIso();

  db.prepare(`
    INSERT OR IGNORE INTO settings (
      id, app_name, merchant_display_name, base_url, default_currency, allowed_payment_methods,
      monei_api_key, monei_account_id, callback_path, complete_url,
      fail_url, cancel_url, smtp_host, smtp_port, smtp_secure, smtp_user,
      smtp_pass, smtp_from, smtp_from_name, notification_default_email,
      email_subject_template, email_body_template, created_at, updated_at
    )
    VALUES (
      1, @appName, @merchantDisplayName, @baseUrl, @defaultCurrency, @allowedPaymentMethods,
      @moneiApiKey, @moneiAccountId, @callbackPath, @completeUrl,
      @failUrl, @cancelUrl, @smtpHost, @smtpPort, @smtpSecure, @smtpUser,
      @smtpPass, @smtpFrom, @smtpFromName, @notificationDefaultEmail,
      @emailSubjectTemplate, @emailBodyTemplate, @createdAt, @updatedAt
    )
  `).run({
    ...seed,
    allowedPaymentMethods: JSON.stringify(seed.allowedPaymentMethods),
    smtpSecure: seed.smtpSecure ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  });

  return db;
}

export const db = globalForDatabase.__paylinkDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.__paylinkDb = db;
}
