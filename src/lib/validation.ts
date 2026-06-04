import { z } from "zod";
import { SUPPORTED_PAYMENT_METHODS } from "@/lib/constants";

const EUR_CURRENCY = "EUR";
const paymentMethodSchema = z.enum(SUPPORTED_PAYMENT_METHODS);
const userRoleSchema = z.enum(["superadmin", "user"]);
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.");
const passwordConfirmationSchema = z
  .string()
  .min(8, "Debes repetir la contraseña con al menos 8 caracteres.");
const optionalPasswordSchema = passwordSchema.or(z.literal(""));
const optionalPasswordConfirmationSchema = passwordConfirmationSchema.or(z.literal(""));
const optionalEmailSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || z.email().safeParse(value).success, "Introduce un email válido.");
const optionalUrlOrPathSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === ""
      || value.startsWith("/")
      || /^https?:\/\//i.test(value),
    "Introduce una URL válida o una ruta que empiece por '/'.",
  );
const publicBaseUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^https?:\/\/[^\s]+$/i.test(value),
    "Introduce una Base URL válida, por ejemplo https://tu-dominio.com.",
  );
const callbackPathSchema = z
  .string()
  .trim()
  .regex(/^\/[^\s]*$/, "El path del webhook debe empezar por '/' y no contener espacios.");
const smtpHostSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !/\s/.test(value),
    "El SMTP host no puede contener espacios.",
  );
const amountSchema = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, "Introduce un importe válido con hasta 2 decimales.")
  .refine((value) => Number(value.replace(",", ".")) > 0, "El importe debe ser mayor que 0.");
const optionalPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^[+()\-\d\s]{6,20}$/.test(value),
    "Introduce un teléfono válido.",
  );
const usernameSchema = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres.")
  .regex(/^[a-z0-9._-]+$/i, "El usuario solo puede contener letras, números, punto, guion y guion bajo.");
const displayNameSchema = z.string().trim().min(1, "El nombre visible es obligatorio.");

export const settingsInputSchema = z.object({
  appName: z.string().trim().min(1, "El nombre de la app es obligatorio."),
  merchantDisplayName: z.string().trim().min(1, "El nombre del comercio es obligatorio."),
  baseUrl: publicBaseUrlSchema,
  defaultCurrency: z.literal(EUR_CURRENCY),
  allowedPaymentMethods: z.array(paymentMethodSchema).min(1),
  moneiApiKey: z.string().trim(),
  moneiAccountId: z.string().trim(),
  callbackPath: callbackPathSchema,
  completeUrl: optionalUrlOrPathSchema,
  failUrl: optionalUrlOrPathSchema,
  cancelUrl: optionalUrlOrPathSchema,
  smtpHost: smtpHostSchema,
  smtpPort: z.number().int().min(1, "El puerto SMTP debe ser mayor que 0.").max(65535, "El puerto SMTP no es válido."),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim(),
  smtpPass: z.string().trim(),
  smtpFrom: optionalEmailSchema,
  smtpFromName: z.string().trim(),
  notificationDefaultEmail: optionalEmailSchema,
  emailSubjectTemplate: z.string().trim().min(1, "El asunto del email es obligatorio."),
  emailBodyTemplate: z.string().trim().min(1, "El cuerpo del email es obligatorio."),
});

export const createPaylinkInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio."),
  description: z.string().trim().optional().default(""),
  amount: amountSchema,
  currency: z.literal(EUR_CURRENCY),
  recipientEmail: optionalEmailSchema.optional().default(""),
  customerName: z.string().trim().optional().default(""),
  customerEmail: optionalEmailSchema.optional().default(""),
  customerPhone: optionalPhoneSchema.optional().default(""),
  allowedPaymentMethods: z.array(paymentMethodSchema).min(1),
});

export const loginInputSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const createUserInputSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    password: passwordSchema,
    confirmPassword: passwordConfirmationSchema,
    role: userRoleSchema,
    active: z.boolean(),
    canViewAllPayments: z.boolean(),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas deben coincidir.",
      });
    }
  });

export const updateUserInputSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    password: optionalPasswordSchema,
    confirmPassword: optionalPasswordConfirmationSchema,
    role: userRoleSchema,
    active: z.boolean(),
    canViewAllPayments: z.boolean(),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    const isUpdatingPassword = password.length > 0 || confirmPassword.length > 0;

    if (!isUpdatingPassword) {
      return;
    }

    if (!password || !confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Debes escribir la nueva contraseña dos veces.",
      });
      return;
    }

    if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas deben coincidir.",
      });
    }
  });
