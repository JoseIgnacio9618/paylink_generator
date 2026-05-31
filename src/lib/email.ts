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

function renderInfoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 0 0 10px; width: 150px; font: 600 13px/1.4 Arial, sans-serif; color: #52606d; vertical-align: top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 0 0 10px; font: 400 14px/1.6 Arial, sans-serif; color: #122226; vertical-align: top;">
        ${escapeHtml(value || "-")}
      </td>
    </tr>
  `;
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "PG";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function buildPaymentSuccessHtml(input: {
  settings: SettingsRecord;
  context: Record<string, string>;
  customMessage: string;
}) {
  const brandName = input.settings.appName || "Paylink Generator";
  const merchantName = input.settings.merchantDisplayName || brandName;
  const brandInitials = getInitials(brandName);
  const customerRows = [
    renderInfoRow("Cliente", input.context.customerName),
    renderInfoRow("Email cliente", input.context.customerEmail),
    renderInfoRow("Telefono cliente", input.context.customerPhone),
  ].join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(input.context.title)}</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #edf2f7; color: #182430;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 720px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 0 20px;">
                    <div style="border: 1px solid rgba(24, 36, 48, 0.12); border-radius: 32px; overflow: hidden; background: #f8fbff; box-shadow: 0 24px 80px rgba(24, 36, 48, 0.1);">
                      <div style="padding: 30px 32px 24px; background: radial-gradient(circle at 12% 18%, rgba(182, 138, 87, 0.16), transparent 0 11rem), radial-gradient(circle at 88% 12%, rgba(48, 95, 141, 0.16), transparent 0 12rem), linear-gradient(180deg, #f8fbff 0%, #edf2f7 100%); border-bottom: 1px solid rgba(24, 36, 48, 0.08);">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td style="vertical-align: top;">
                              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                <tr>
                                  <td style="width: 58px; height: 58px; border-radius: 18px; background: linear-gradient(135deg, #305f8d 0%, #214566 100%); text-align: center; font: 700 22px/58px Arial, sans-serif; color: #ffffff; box-shadow: 0 14px 26px rgba(48, 95, 141, 0.24);">
                                    ${escapeHtml(brandInitials)}
                                  </td>
                                  <td style="padding-left: 14px; vertical-align: middle;">
                                    <div style="font: 700 18px/1.15 Arial, sans-serif; color: #182430;">
                                      ${escapeHtml(brandName)}
                                    </div>
                                    <div style="margin-top: 5px; font: 600 12px/1 Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #667689;">
                                      Confirmacion de cobro
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                            <td align="right" style="vertical-align: top;">
                              <div style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: rgba(182, 138, 87, 0.14); font: 700 11px/1 Arial, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; color: #8c6737;">
                                Pago confirmado
                              </div>
                            </td>
                          </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 22px; border-collapse: collapse;">
                          <tr>
                            <td style="vertical-align: top;">
                              <h1 style="margin: 0 0 10px; font: 700 32px/1.1 Arial, sans-serif; letter-spacing: -0.03em; color: #182430;">
                                ${escapeHtml(input.context.title)}
                              </h1>
                              <p style="margin: 0; max-width: 420px; font: 400 15px/1.7 Arial, sans-serif; color: #667689;">
                                ${escapeHtml(merchantName)} ha recibido correctamente el pago y ha actualizado el estado del cobro en el panel.
                              </p>
                            </td>
                            <td align="right" style="padding-left: 18px; vertical-align: top;">
                              <div style="min-width: 170px; padding: 16px 18px; border: 1px solid rgba(24, 36, 48, 0.08); border-radius: 24px; background: rgba(255, 255, 255, 0.78);">
                                <div style="font: 700 11px/1 Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #667689;">
                                  Importe
                                </div>
                                <div style="margin-top: 10px; font: 700 28px/1.05 Arial, sans-serif; color: #182430;">
                                  ${escapeHtml(input.context.price)}
                                </div>
                                <div style="margin-top: 12px; font: 600 12px/1.5 Arial, sans-serif; color: #667689;">
                                  Pedido ${escapeHtml(input.context.orderId)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <div style="padding: 0 32px 32px;">
                        <div style="margin: 24px 0 20px; padding: 18px 20px; border: 1px solid rgba(24, 36, 48, 0.1); border-radius: 22px; background: rgba(255, 255, 255, 0.94);">
                          <p style="margin: 0 0 10px; font: 700 12px/1 Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #667689;">
                            Resumen
                          </p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                            ${renderInfoRow("Descripcion", input.context.description)}
                            ${renderInfoRow("Precio", input.context.price)}
                            ${renderInfoRow("Estado", input.context.status)}
                            ${renderInfoRow("Pedido", input.context.orderId)}
                            ${renderInfoRow("ID MONEI", input.context.moneiPaymentId)}
                            ${renderInfoRow("Metodo", input.context.paymentMethod)}
                          </table>
                        </div>

                        <div style="margin: 0 0 20px; padding: 18px 20px; border: 1px solid rgba(24, 36, 48, 0.1); border-radius: 22px; background: rgba(255, 255, 255, 0.94);">
                          <p style="margin: 0 0 10px; font: 700 12px/1 Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #667689;">
                            Cliente
                          </p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                            ${customerRows}
                          </table>
                        </div>

                        <div style="margin: 0 0 20px; padding: 18px 20px; border: 1px solid rgba(24, 36, 48, 0.1); border-radius: 22px; background: linear-gradient(180deg, rgba(48, 95, 141, 0.05) 0%, rgba(255, 255, 255, 0.96) 100%);">
                          <p style="margin: 0 0 10px; font: 700 12px/1 Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #667689;">
                            Mensaje
                          </p>
                          <p style="margin: 0; white-space: pre-line; font: 400 14px/1.7 Arial, sans-serif; color: #31424f;">
                            ${escapeHtml(input.customMessage)}
                          </p>
                        </div>

                        ${
                          input.context.paymentUrl
                            ? `
                              <div style="text-align: center; margin: 28px 0 20px;">
                                <a
                                  href="${escapeHtml(input.context.paymentUrl)}"
                                  style="display: inline-block; padding: 15px 24px; border-radius: 18px; background: linear-gradient(135deg, #305f8d 0%, #214566 100%); color: #ffffff; text-decoration: none; font: 700 14px/1 Arial, sans-serif; box-shadow: 0 16px 28px rgba(48, 95, 141, 0.22);"
                                >
                                  Abrir checkout
                                </a>
                              </div>
                            `
                            : ""
                        }

                        <div style="padding-top: 8px; border-top: 1px solid rgba(24, 36, 48, 0.08);">
                          <p style="margin: 0; font: 400 12px/1.7 Arial, sans-serif; color: #667689;">
                            Este mensaje se ha generado automáticamente desde ${escapeHtml(brandName)} para ${escapeHtml(merchantName)}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

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
    customerName: paylink.customerName || payment.customer?.name || "-",
    customerEmail: paylink.customerEmail || payment.customer?.email || "-",
    customerPhone: paylink.customerPhone || payment.customer?.phone || "-",
    paymentMethod:
      payment.paymentMethod?.method ?? (paylink.allowedPaymentMethods.join(", ") || "-"),
  };

  const text = renderTemplate(settings.emailBodyTemplate, context);
  const html = buildPaymentSuccessHtml({
    settings,
    context,
    customMessage: text,
  });

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
