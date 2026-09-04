import { randomUUID } from "node:crypto";
import type { Payment } from "@monei-js/node-sdk";
import { execute, query, queryOne } from "@/lib/db";
import { getPaymentNotificationRecipients, sendPaymentSuccessNotification } from "@/lib/email";
import { getPaylinkById, markNotificationResult } from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";
import type { PaylinkRecord } from "@/lib/types";
import { nowIso } from "@/lib/utils";

type NotificationJobRow = {
  id: string; paylink_id: string; monei_payment_id: string; payload: string; attempts: number;
  available_at: string; locked_at: string; sent_at: string; last_error: string;
};

const MAX_NOTIFICATION_ATTEMPTS = 8;
const JOB_CLAIM_BATCH_SIZE = 5;
const JOB_LOCK_STALE_MS = 60_000;
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000] as const;

export async function queuePaymentSuccessNotification(
  settings: Awaited<ReturnType<typeof getSettings>>,
  paylink: Pick<PaylinkRecord, "id" | "moneiPaymentId" | "recipientEmail" | "notificationSentAt">,
  payment: Payment,
) {
  if (paylink.notificationSentAt) return;
  const recipients = getPaymentNotificationRecipients(settings, paylink);
  await markNotificationResult(paylink.id, { recipients });
  const now = nowIso();
  await execute(
    `INSERT INTO notification_jobs (
      id, job_type, paylink_id, monei_payment_id, payload, attempts, available_at,
      locked_at, sent_at, last_error, created_at, updated_at
    ) VALUES ($1, 'payment_success_email', $2, $3, $4, 0, $5, '', '', '', $6, $7)
    ON CONFLICT(paylink_id, job_type) DO UPDATE SET
      monei_payment_id = EXCLUDED.monei_payment_id, payload = EXCLUDED.payload,
      attempts = 0, available_at = EXCLUDED.available_at, locked_at = '',
      last_error = '', updated_at = EXCLUDED.updated_at
    WHERE notification_jobs.sent_at = ''`,
    [randomUUID(), paylink.id, paylink.moneiPaymentId, JSON.stringify(payment), now, now, now],
  );
}

export async function processPendingNotificationJobs() {
  while (true) {
    const jobs = await claimPendingNotificationJobs(JOB_CLAIM_BATCH_SIZE);
    if (jobs.length === 0) return;
    for (const job of jobs) await processNotificationJob(job);
  }
}

async function claimPendingNotificationJobs(limit: number) {
  const now = nowIso();
  const staleBefore = new Date(Date.now() - JOB_LOCK_STALE_MS).toISOString();
  return query<NotificationJobRow>(`
    WITH candidates AS (
      SELECT id FROM notification_jobs
      WHERE sent_at = '' AND attempts < $1 AND available_at <= $2
        AND (locked_at = '' OR locked_at <= $3)
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED LIMIT $4
    )
    UPDATE notification_jobs AS jobs
    SET locked_at = $2, updated_at = $2
    FROM candidates
    WHERE jobs.id = candidates.id
    RETURNING jobs.id, jobs.paylink_id, jobs.monei_payment_id, jobs.payload,
      jobs.attempts, jobs.available_at, jobs.locked_at, jobs.sent_at, jobs.last_error
  `, [MAX_NOTIFICATION_ATTEMPTS, now, staleBefore, limit]);
}

async function processNotificationJob(job: NotificationJobRow) {
  const paylink = await getPaylinkById(job.paylink_id);
  if (!paylink) return markNotificationJobTerminal(job.id, "Paylink no encontrado.");
  if (paylink.notificationSentAt) return markNotificationJobAsSent(job.id, paylink.notificationSentAt);
  const settings = await getSettings();
  const recipients = getPaymentNotificationRecipients(settings, paylink);

  try {
    const notification = await sendPaymentSuccessNotification(settings, paylink, JSON.parse(job.payload) as Payment);
    await markNotificationResult(paylink.id, notification.sent
      ? notification
      : { error: notification.error, recipients: notification.recipients });
    if (notification.sent) return markNotificationJobAsSent(job.id, notification.sentAt ?? nowIso());
    return markNotificationJobRetry(job, notification.error ?? "No se pudo entregar la notificación.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery error.";
    await markNotificationResult(paylink.id, { error: message, recipients });
    return markNotificationJobRetry(job, message);
  }
}

async function markNotificationJobAsSent(jobId: string, sentAt: string) {
  const now = nowIso();
  await execute("UPDATE notification_jobs SET sent_at = $1, locked_at = '', last_error = '', updated_at = $2 WHERE id = $3", [sentAt || now, now, jobId]);
}

async function markNotificationJobTerminal(jobId: string, message: string) {
  await execute("UPDATE notification_jobs SET attempts = $1, locked_at = '', last_error = $2, updated_at = $3 WHERE id = $4", [MAX_NOTIFICATION_ATTEMPTS, message, nowIso(), jobId]);
}

async function markNotificationJobRetry(job: NotificationJobRow, message: string) {
  const attempts = job.attempts + 1;
  const availableAt = new Date(Date.now() + getRetryDelayMs(attempts)).toISOString();
  await execute(
    "UPDATE notification_jobs SET attempts = $1, available_at = $2, locked_at = '', last_error = $3, updated_at = $4 WHERE id = $5",
    [attempts, availableAt, message, nowIso(), job.id],
  );
}

function getRetryDelayMs(attempts: number) {
  return RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)] ?? 60 * 60_000;
}

export async function getNextNotificationRetryAt() {
  return queryOne<{ available_at: string }>(`
    SELECT available_at FROM notification_jobs
    WHERE sent_at = '' AND attempts < $1 AND available_at != ''
    ORDER BY available_at ASC LIMIT 1
  `, [MAX_NOTIFICATION_ATTEMPTS]);
}
