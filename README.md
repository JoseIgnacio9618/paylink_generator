# Paylink Generator

A Next.js application for creating MONEI payment links, storing all operations in SQLite, and sending emails when a payment is confirmed.

## What It Does

* Creates MONEI hosted payments from a title, description, and price.
* Stores settings, payment links, statuses, and events in `SQLite` (`data/paylink.sqlite`).
* Uses the MONEI webhook as the source of truth to determine whether a payment has been successfully completed.
* Sends an email to the additional recipient specified for the payment link and to a configurable default email address.
* Allows settings to be edited directly from the user interface.

## Getting Started

1. Install the dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Configure at least the following variables:

* `APP_BASE_URL`
* `MONEI_API_KEY`
* `DEFAULT_NOTIFICATION_EMAIL`
* `SMTP_HOST`
* `SMTP_PORT`
* `SMTP_FROM`

4. Start the application locally:

```bash
npm run start
```

This command starts `next dev` through `nodemon` at `http://localhost:3000`.

To start Next.js without the tunnel:

```bash
npm run dev
```

## Implemented MONEI Flow

* A `payment` is created through `POST /payments`.
* The application uses `payment.nextAction.redirectUrl` as the shareable payment link.
* The webhook is received at `/api/monei/webhook`.
* The `MONEI-Signature` header is verified using HMAC SHA-256 with the API key.
* The final payment status is stored in SQLite and, when it changes to `SUCCEEDED`, the application attempts to send the notification email.

## Environment Variables

The values from the `.env` file are used as the initial seed data for the `settings` table. They can later be changed from the user interface.

* `APP_NAME`
* `MERCHANT_DISPLAY_NAME`
* `APP_BASE_URL`
* `DEFAULT_CURRENCY`
* `DEFAULT_ALLOWED_PAYMENT_METHODS`
* `MONEI_API_KEY`
* `MONEI_ACCOUNT_ID`
* `MONEI_CALLBACK_PATH`
* `MONEI_COMPLETE_URL`
* `MONEI_FAIL_URL`
* `MONEI_CANCEL_URL`
* `DEFAULT_NOTIFICATION_EMAIL`
* `SMTP_HOST`
* `SMTP_PORT`
* `SMTP_SECURE`
* `SMTP_USER`
* `SMTP_PASS`
* `SMTP_FROM`
* `SMTP_FROM_NAME`
* `EMAIL_SUBJECT_TEMPLATE`

## Notes

* If the `Base URL` is not configured correctly, MONEI will not be able to call the webhook.
* If the SMTP configuration is incomplete, the payment will still be recorded, but the email will not be sent.
* It is assumed that “Microsoft SQL Lite” actually referred to `SQLite`, as it is the standard embedded database for this type of application.
