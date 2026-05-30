import nodemailer from "nodemailer";
import type { Payment } from "@monei-js/node-sdk";
import type { PaylinkRecord, SettingsRecord } from "@/lib/types";
import {
  escapeHtml,
  formatCurrency,
  nowIso,
  renderTemplate,
  uniqueEmails,
} from "@/lib/utils";

export async function sendPaymentSuccessNotification(
  settings: SettingsRecord,
  paylink: PaylinkRecord,
  payment: Payment,
) {
  const recipients = uniqueEmails([
    paylink.recipientEmail,
    settings.notificationDefaultEmail,
  ]);

  if (recipients.length === 0) {
    return {
      sent: false,
      recipients: [],
      error: "No hay destinatarios configurados para el aviso.",
    };
  }

  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpFrom) {
    return {
      sent: false,
      recipients,
      error: "La configuración SMTP está incompleta.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth:
      settings.smtpUser || settings.smtpPass
        ? {
            user: settings.smtpUser,
            pass: settings.smtpPass,
          }
        : undefined,
  });

  const context = {
    title: paylink.title,
    description: paylink.description || "-",
    price: formatCurrency(paylink.amountCents, paylink.currency),
    status: payment.status ?? paylink.moneiStatus,
    orderId: paylink.orderId,
    paymentUrl: paylink.paymentUrl || payment.nextAction?.redirectUrl || "",
    moneiPaymentId: paylink.moneiPaymentId,
  };

  const text = renderTemplate(settings.emailBodyTemplate, context);
  const html = escapeHtml(text).replaceAll("\n", "<br />");

  await transporter.sendMail({
    from: settings.smtpFromName
      ? `${settings.smtpFromName} <${settings.smtpFrom}>`
      : settings.smtpFrom,
    to: recipients.join(", "),
    subject: renderTemplate(settings.emailSubjectTemplate, context),
    text,
    html,
  });

  return {
    sent: true,
    recipients,
    sentAt: nowIso(),
  };
}
