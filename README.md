# Paylink Generator

Aplicación Next.js para crear links de pago con MONEI, guardar toda la operativa en SQLite y disparar correos cuando el pago se confirma.

## Qué hace

- Crea pagos hosted de MONEI a partir de título, descripción y precio.
- Guarda configuración, links, estados y eventos en `SQLite` (`data/paylink.sqlite`).
- Usa el webhook de MONEI como fuente de verdad para marcar si un pago está cobrado o no.
- Envía un email al destinatario adicional del link y a un email estándar configurable.
- Permite editar la configuración desde la propia interfaz.

## Puesta en marcha

1. Instala dependencias:

```bash
npm install
```

2. Crea tu entorno:

```bash
cp .env.example .env.local
```

3. Completa al menos:

- `APP_BASE_URL`
- `MONEI_API_KEY`
- `DEFAULT_NOTIFICATION_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`

4. Arranca en local:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Flujo MONEI implementado

- Se crea un `payment` vía `POST /payments`.
- La app usa `payment.nextAction.redirectUrl` como link de pago compartible.
- El webhook llega a `/api/monei/webhook`.
- La firma `MONEI-Signature` se verifica con HMAC SHA-256 usando la API key.
- El estado definitivo se persiste en SQLite y, si pasa a `SUCCEEDED`, se intenta enviar el correo.

## Variables de entorno

Los valores del `.env` se usan como semilla inicial en la tabla `settings`. Después puedes cambiarlos desde la UI.

- `APP_NAME`
- `MERCHANT_DISPLAY_NAME`
- `APP_BASE_URL`
- `DEFAULT_CURRENCY`
- `DEFAULT_ALLOWED_PAYMENT_METHODS`
- `MONEI_API_KEY`
- `MONEI_ACCOUNT_ID`
- `MONEI_CALLBACK_PATH`
- `MONEI_COMPLETE_URL`
- `MONEI_FAIL_URL`
- `MONEI_CANCEL_URL`
- `DEFAULT_NOTIFICATION_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_FROM_NAME`
- `EMAIL_SUBJECT_TEMPLATE`

## Notas

- Si `Base URL` no está bien configurada, MONEI no podrá llamar al webhook.
- Si el SMTP está incompleto, el pago se registrará igualmente pero el email no saldrá.
- Se asume que “Microsoft SQL Lite” en realidad era `SQLite`, porque es la base embebida estándar en este escenario.
