import { z } from "zod";
import { SUPPORTED_PAYMENT_METHODS } from "@/lib/constants";

const paymentMethodSchema = z.enum(SUPPORTED_PAYMENT_METHODS);

export const settingsInputSchema = z.object({
  appName: z.string().trim().min(1),
  merchantDisplayName: z.string().trim().min(1),
  baseUrl: z.string().trim(),
  defaultCurrency: z.string().trim().min(3).max(3),
  allowedPaymentMethods: z.array(paymentMethodSchema).min(1),
  moneiApiKey: z.string().trim(),
  moneiAccountId: z.string().trim(),
  callbackPath: z.string().trim().min(1),
  completeUrl: z.string().trim(),
  failUrl: z.string().trim(),
  cancelUrl: z.string().trim(),
  smtpHost: z.string().trim(),
  smtpPort: z.number().int().positive(),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim(),
  smtpPass: z.string().trim(),
  smtpFrom: z.string().trim(),
  smtpFromName: z.string().trim(),
  notificationDefaultEmail: z.string().trim(),
  emailSubjectTemplate: z.string().trim().min(1),
  emailBodyTemplate: z.string().trim().min(1),
});

export const createPaylinkInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().default(""),
  amount: z.string().trim().min(1),
  currency: z.string().trim().min(3).max(3),
  recipientEmail: z.string().trim().optional().default(""),
  customerName: z.string().trim().optional().default(""),
  customerEmail: z.string().trim().optional().default(""),
  customerPhone: z.string().trim().optional().default(""),
  allowedPaymentMethods: z.array(paymentMethodSchema).min(1),
});
