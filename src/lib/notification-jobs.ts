import { randomUUID } from "node:crypto";
import type { Payment } from "@monei-js/node-sdk";
import {
  getPaymentNotificationRecipients,
  sendPaymentSuccessNotification,
} from "@/lib/email";
import { db } from "@/lib/db";
import { getPaylinkById, markNotificationResult } from "@/lib/paylinks";
import { getSettings } from "@/lib/settings";
import type { PaylinkRecord } from "@/lib/types";
import { nowIso } from "@/lib/utils";

type NotificationJobType = "payment_success_email";

type NotificationJobRow = {
  id: string;
  job_type: NotificationJobType;
  paylink_id: string;
  monei_payment_id: string;
  payload: string;
  attempts: number;
  available_at: string;
  locked_at: string;
  sent_at: string;
  last_error: string;
  created_at: string;
  updated_at: string;
};

const PAYMENT_SUCCESS_EMAIL_JOB: NotificationJobType = "payment_success_email";
const MAX_NOTIFICATION_ATTEMPTS = 8;
const JOB_CLAIM_BATCH_SIZE = 5;
const JOB_LOCK_STALE_MS = 60_000;
const RETRY_DELAYS_MS = [
  10_000,
  30_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
] as const;

const globalForNotificationJobs = globalThis as typeof globalThis & {
  __paylinkNotificationJobRunnerActive?: boolean;
  __paylinkNotificationJobTimer?: ReturnType<typeof setTimeout>;
  __paylinkNotificationJobTimerAt?: number;
};

export function queuePaymentSuccessNotification(
  settings: ReturnType<typeof getSettings>,
  paylink: Pick<
    PaylinkRecord,
    "id" | "moneiPaymentId" | "recipientEmail" | "notificationSentAt"
  >,
  payment: Payment,
) {
  if (paylink.notificationSentAt) {
    return;
  }

  const recipients = getPaymentNotificationRecipients(settings, paylink);
  markNotificationResult(paylink.id, { recipients });

  const now = nowIso();
  db.prepare(`
    INSERT INTO notification_jobs (
      id, job_type, paylink_id, monei_payment_id, payload,
      attempts, available_at, locked_at, sent_at, last_error, created_at, updated_at
    )
    VALUES (
      @id, @jobType, @paylinkId, @moneiPaymentId, @payload,
      0, @availableAt, '', '', '', @createdAt, @updatedAt
    )
    ON CONFLICT(paylink_id, job_type) DO UPDATE SET
      monei_payment_id = excluded.monei_payment_id,
      payload = excluded.payload,
      attempts = 0,
      available_at = excluded.available_at,
      locked_at = '',
      last_error = '',
      updated_at = excluded.updated_at
    WHERE notification_jobs.sent_at = ''
  `).run({
    id: randomUUID(),
    jobType: PAYMENT_SUCCESS_EMAIL_JOB,
    paylinkId: paylink.id,
    moneiPaymentId: paylink.moneiPaymentId,
    payload: JSON.stringify(payment),
    availableAt: now,
    createdAt: now,
    updatedAt: now,
  });

  scheduleNotificationJobProcessing();
}

export function scheduleNotificationJobProcessing(delayMs = 0) {
  const desiredRunAt = Date.now() + Math.max(0, delayMs);
  const currentRunAt = globalForNotificationJobs.__paylinkNotificationJobTimerAt;

  if (currentRunAt !== undefined && currentRunAt <= desiredRunAt) {
    return;
  }

  if (globalForNotificationJobs.__paylinkNotificationJobTimer) {
    clearTimeout(globalForNotificationJobs.__paylinkNotificationJobTimer);
  }

  globalForNotificationJobs.__paylinkNotificationJobTimerAt = desiredRunAt;
  globalForNotificationJobs.__paylinkNotificationJobTimer = setTimeout(() => {
    globalForNotificationJobs.__paylinkNotificationJobTimer = undefined;
    globalForNotificationJobs.__paylinkNotificationJobTimerAt = undefined;
    void processPendingNotificationJobs();
  }, Math.max(0, desiredRunAt - Date.now()));

  globalForNotificationJobs.__paylinkNotificationJobTimer.unref?.();
}

export async function processPendingNotificationJobs() {
  if (globalForNotificationJobs.__paylinkNotificationJobRunnerActive) {
    return;
  }

  globalForNotificationJobs.__paylinkNotificationJobRunnerActive = true;

  try {
    while (true) {
      const jobs = claimPendingNotificationJobs(JOB_CLAIM_BATCH_SIZE);

      if (jobs.length === 0) {
        break;
      }

      for (const job of jobs) {
        await processNotificationJob(job);
      }
    }
  } finally {
    globalForNotificationJobs.__paylinkNotificationJobRunnerActive = false;
    scheduleNextNotificationRetry();
  }
}

function claimPendingNotificationJobs(limit: number) {
  const now = nowIso();
  const staleBefore = new Date(Date.now() - JOB_LOCK_STALE_MS).toISOString();

  const claim = db.transaction(() => {
    const rows = db.prepare(`
      SELECT *
      FROM notification_jobs
      WHERE sent_at = ''
        AND attempts < ?
        AND available_at <= ?
        AND (locked_at = '' OR locked_at <= ?)
      ORDER BY datetime(available_at) ASC, datetime(created_at) ASC
      LIMIT ?
    `).all(
      MAX_NOTIFICATION_ATTEMPTS,
      now,
      staleBefore,
      limit,
    ) as NotificationJobRow[];

    if (rows.length === 0) {
      return [] as NotificationJobRow[];
    }

    const updateClaim = db.prepare(`
      UPDATE notification_jobs
      SET locked_at = ?, updated_at = ?
      WHERE id = ?
        AND sent_at = ''
        AND attempts < ?
        AND available_at <= ?
        AND (locked_at = '' OR locked_at <= ?)
    `);

    const claimed: NotificationJobRow[] = [];

    for (const row of rows) {
      const result = updateClaim.run(
        now,
        now,
        row.id,
        MAX_NOTIFICATION_ATTEMPTS,
        now,
        staleBefore,
      );

      if (result.changes > 0) {
        claimed.push({
          ...row,
          locked_at: now,
          updated_at: now,
        });
      }
    }

    return claimed;
  });

  return claim();
}

async function processNotificationJob(job: NotificationJobRow) {
  const paylink = getPaylinkById(job.paylink_id);

  if (!paylink) {
    markNotificationJobTerminal(job.id, "Paylink no encontrado.");
    return;
  }

  if (paylink.notificationSentAt) {
    markNotificationJobAsSent(job.id, paylink.notificationSentAt);
    return;
  }

  const settings = getSettings();
  const recipients = getPaymentNotificationRecipients(settings, paylink);

  try {
    const notification = await sendPaymentSuccessNotification(
      settings,
      paylink,
      JSON.parse(job.payload) as Payment,
    );

    markNotificationResult(
      paylink.id,
      notification.sent
        ? notification
        : { error: notification.error, recipients: notification.recipients },
    );

    if (notification.sent) {
      markNotificationJobAsSent(job.id, notification.sentAt ?? nowIso());
      console.info("Notification job completed.", {
        paylinkId: paylink.id,
        paymentId: paylink.moneiPaymentId,
        recipients: notification.recipients.length,
      });
      return;
    }

    markNotificationJobRetry(
      job,
      notification.error ?? "No se pudo entregar la notificacion.",
      recipients,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery error.";

    console.error("Notification job failed:", {
      paylinkId: paylink.id,
      paymentId: paylink.moneiPaymentId,
      message,
    });

    markNotificationResult(paylink.id, {
      error: message,
      recipients,
    });
    markNotificationJobRetry(job, message, recipients);
  }
}

function markNotificationJobAsSent(jobId: string, sentAt: string) {
  const now = nowIso();
  db.prepare(`
    UPDATE notification_jobs
    SET
      sent_at = ?,
      locked_at = '',
      last_error = '',
      updated_at = ?
    WHERE id = ?
  `).run(sentAt || now, now, jobId);
}

function markNotificationJobTerminal(jobId: string, message: string) {
  const now = nowIso();
  db.prepare(`
    UPDATE notification_jobs
    SET
      attempts = ?,
      locked_at = '',
      last_error = ?,
      updated_at = ?
    WHERE id = ?
  `).run(MAX_NOTIFICATION_ATTEMPTS, message, now, jobId);
}

function markNotificationJobRetry(
  job: NotificationJobRow,
  message: string,
  recipients: string[],
) {
  const attempts = job.attempts + 1;
  const nextDelayMs = getRetryDelayMs(attempts);
  const availableAt = new Date(Date.now() + nextDelayMs).toISOString();
  const now = nowIso();

  db.prepare(`
    UPDATE notification_jobs
    SET
      attempts = ?,
      available_at = ?,
      locked_at = '',
      last_error = ?,
      updated_at = ?
    WHERE id = ?
  `).run(attempts, availableAt, message, now, job.id);

  console.warn("Notification job queued for retry.", {
    paylinkId: job.paylink_id,
    paymentId: job.monei_payment_id,
    attempts,
    nextDelayMs,
    recipients: recipients.length,
    message,
  });
}

function scheduleNextNotificationRetry() {
  const row = db.prepare(`
    SELECT available_at
    FROM notification_jobs
    WHERE sent_at = ''
      AND attempts < ?
      AND available_at != ''
    ORDER BY datetime(available_at) ASC
    LIMIT 1
  `).get(MAX_NOTIFICATION_ATTEMPTS) as { available_at: string } | undefined;

  if (!row?.available_at) {
    return;
  }

  const delayMs = Math.max(0, new Date(row.available_at).getTime() - Date.now());
  scheduleNotificationJobProcessing(delayMs);
}

function getRetryDelayMs(attempts: number) {
  return RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)] ?? 60 * 60_000;
}
