# Guia de configuracion del webhook de MONEI para esta aplicacion

## Objetivo

Esta guia explica como dejar funcionando el webhook de MONEI en **esta app en concreto**, que usa:

- `callbackUrl` por pago al crear el checkout;
- endpoint local en `src/app/api/monei/webhook/route.ts`;
- verificacion de firma con el header `MONEI-Signature`;
- actualizacion del estado en SQLite;
- envio de email cuando el pago pasa a `SUCCEEDED`.

## Resumen rapido

Para que el webhook funcione en esta app necesitas:

1. Tener una `Base URL` publica y accesible desde internet.
2. Mantener `Path del webhook` como `/api/monei/webhook` salvo que quieras cambiar la ruta.
3. Guardar en la app la `MONEI_API_KEY` correcta del mismo entorno que uses para crear pagos.
4. Crear los pagos desde esta app para que MONEI reciba el `callbackUrl` correcto.
5. Verificar que el endpoint responde `200` y que la firma se valida.

## Como funciona el webhook en esta app

Esta app **no depende de un webhook global configurado manualmente en el dashboard para cada pago**.

Cuando crea un pago, envía a MONEI un `callbackUrl` calculado con:

- `Base URL`
- `Path del webhook`

Eso se hace en [src/lib/monei.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/lib/monei.ts:54) y [src/lib/monei.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/lib/monei.ts:68).

El endpoint receptor es:

- [src/app/api/monei/webhook/route.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/app/api/monei/webhook/route.ts:1)

## URL exacta que usa esta app

La URL final del webhook es:

```text
{Base URL}{Path del webhook}
```

Ejemplo recomendado:

```text
Base URL: https://pagos.tudominio.com
Path del webhook: /api/monei/webhook
Webhook final: https://pagos.tudominio.com/api/monei/webhook
```

## Paso 1. Configura una URL publica real

El webhook de MONEI tiene que llamar a una URL accesible desde fuera.

Esto significa:

- `http://localhost:3000` no sirve en produccion;
- una IP privada o una URL interna de tu red no sirve;
- necesitas una URL publica por `HTTPS`.

Si estas probando en local, usa un tunel publico tipo `ngrok` o similar y pon esa URL como `Base URL`.

Ejemplo:

```text
https://abc123.ngrok-free.app
```

## Paso 2. Rellena la configuracion de esta app

Puedes hacerlo desde el panel de configuracion o desde el `.env` inicial.

Valores clave:

```env
APP_BASE_URL=https://tu-dominio-publico.com
MONEI_API_KEY=pk_test_xxx_o_pk_live_xxx
MONEI_CALLBACK_PATH=/api/monei/webhook
MONEI_COMPLETE_URL=
MONEI_FAIL_URL=
MONEI_CANCEL_URL=
```

Referencias:

- `.env.example` en [/.env.example](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/.env.example:1)
- lectura de settings en [src/lib/settings.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/lib/settings.ts:29)

### Campos minimos

- `Base URL`: tu dominio publico
- `MONEI API key`: la clave del entorno correcto
- `Path del webhook`: normalmente `/api/monei/webhook`

### Recomendacion

No mezcles entornos:

- si el pago se crea con `pk_test_*`, la firma del webhook se debe verificar con esa misma API key de test;
- si el pago se crea con `pk_live_*`, la firma se debe verificar con la API key live.

## Paso 3. Entiende que no hace falta “pegar el webhook” a mano en cada pago

En esta app, el `callbackUrl` se manda al crear el pago.

MONEI documenta que `callbackUrl` es “the URL to which a payment result should be sent asynchronously”:

- [Payment-CallbackUrl](https://docs.monei.com/apis/rest/schemas/payment-callbackurl/)
- [CreatePaymentRequest](https://docs.monei.com/apis/rest/schemas/createpaymentrequest/)

Eso significa que el flujo real aqui es:

1. Creas un link desde la app.
2. La app llama a `payments.create(...)`.
3. En esa llamada se manda `callbackUrl`.
4. MONEI envia el resultado del pago a esa URL.

## Paso 4. Que hace el endpoint cuando recibe el webhook

El endpoint [src/app/api/monei/webhook/route.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/app/api/monei/webhook/route.ts:1) hace esto:

1. Lee el cuerpo raw con `request.text()`.
2. Lee el header `MONEI-Signature`.
3. Verifica la firma con `verifyWebhookSignature(rawBody, signature, settings)`.
4. Busca el pago por `moneiPaymentId` en SQLite.
5. Actualiza el estado del paylink.
6. Si el estado es `SUCCEEDED` y no se ha avisado todavia, intenta enviar el email.
7. Responde `200` con `{ received: true }`.

## Paso 5. Como valida la firma esta app

La validacion la hace en:

- [src/lib/monei.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/lib/monei.ts:39)

Usa el SDK oficial de MONEI con:

```ts
client.verifySignature(rawBody, signature)
```

La documentacion oficial de MONEI indica que:

- el header es `MONEI-Signature`;
- lleva un timestamp `t=...` y una firma `v1=...`;
- la verificacion debe hacerse con el body raw;
- la firma se calcula con HMAC SHA-256 y tu API key.

Fuente oficial:

- [Verify signature](https://docs.monei.com/guides/verify-signature/)

## Paso 6. Respuestas que debes esperar del endpoint

Segun la implementacion actual:

- `400` si falta el header `MONEI-Signature`
- `401` si la firma no valida
- `200` si el webhook se ha recibido y procesado
- `200` con `{ received: true, ignored: true }` si llega un pago que no existe en tu base local
- `500` si hay un error interno al procesarlo

## Paso 7. Como comprobar que esta bien configurado

### Comprobacion minima

1. Configura `Base URL` publica.
2. Configura `MONEI_API_KEY`.
3. Crea un link de pago desde la app.
4. Completa o simula el pago en MONEI.
5. Revisa el historial en `/historial`.

Si el webhook ha llegado bien:

- el estado del pago se actualizara en la tabla;
- `last_payload` cambiara con el payload nuevo;
- si el estado es `SUCCEEDED`, intentara enviar el correo.

## Paso 8. Como probarlo en local

### Opcion recomendada

1. Arranca la app:

```bash
npm run dev
```

2. Expone el puerto con un tunel HTTPS publico.

Ejemplo conceptual:

```bash
ngrok http 3000
```

3. Copia la URL publica del tunel.
4. Pon esa URL en `Base URL`.
5. Crea un pago nuevo desde la app.

Ejemplo:

```text
Base URL = https://abc123.ngrok-free.app
Path del webhook = /api/monei/webhook
Webhook final = https://abc123.ngrok-free.app/api/monei/webhook
```

## Paso 9. Errores habituales en esta app

### `Missing MONEI-Signature header.`

Motivo:

- la llamada no viene realmente de MONEI;
- estas probando con Postman o navegador sin firmar la peticion.

### `Invalid signature.`

Motivo habitual:

- la API key guardada en la app no coincide con la del entorno del pago;
- test y live estan mezclados;
- el body no se esta leyendo como raw en otra implementacion intermedia.

### El pago existe en MONEI pero no cambia en tu app

Motivo habitual:

- `Base URL` no es publica;
- el `callbackUrl` generado es incorrecto;
- el endpoint no era accesible cuando MONEI intento llamar;
- el pago se creo antes de corregir la configuracion.

### Llega el webhook pero no manda email

Motivo habitual:

- falta `SMTP_HOST`, `SMTP_PORT` o `SMTP_FROM`;
- no hay destinatarios (`recipientEmail` y `DEFAULT_NOTIFICATION_EMAIL` vacios).

Referencia:

- [src/lib/email.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/lib/email.ts:12)

## Paso 10. Configuracion recomendada para produccion

Usa algo asi:

```env
APP_BASE_URL=https://pagos.tudominio.com
MONEI_CALLBACK_PATH=/api/monei/webhook
MONEI_API_KEY=pk_live_xxxxxxxxx
MONEI_COMPLETE_URL=/result?status=complete
MONEI_FAIL_URL=/result?status=failed
MONEI_CANCEL_URL=/result?status=cancelled
```

Notas:

- `completeUrl`, `failUrl` y `cancelUrl` no sustituyen al webhook;
- esas URLs son para redirigir al cliente;
- el webhook sigue siendo la fuente de verdad para actualizar el estado real del pago.

Fuentes oficiales:

- [Payment-CallbackUrl](https://docs.monei.com/apis/rest/schemas/payment-callbackurl/)
- [Payment-CompleteUrl](https://docs.monei.com/apis/rest/schemas/payment-completeurl/)
- [Payment-FailUrl](https://docs.monei.com/apis/rest/schemas/payment-failurl/)
- [Payment-CancelUrl](https://docs.monei.com/apis/rest/schemas/payment-cancelurl/)

## Checklist final

- `Base URL` publica y con HTTPS
- `Path del webhook` en `/api/monei/webhook`
- `MONEI_API_KEY` del entorno correcto
- pago creado desde esta app para que salga con `callbackUrl`
- endpoint accesible desde internet
- firma validando correctamente
- historial actualizandose al cambiar el estado
- SMTP configurado si quieres correos automáticos

## Fuentes oficiales

- [Verify signature](https://docs.monei.com/guides/verify-signature/)
- [Payment-CallbackUrl](https://docs.monei.com/apis/rest/schemas/payment-callbackurl/)
- [CreatePaymentRequest](https://docs.monei.com/apis/rest/schemas/createpaymentrequest/)
- [Payment-CompleteUrl](https://docs.monei.com/apis/rest/schemas/payment-completeurl/)
- [Payment-FailUrl](https://docs.monei.com/apis/rest/schemas/payment-failurl/)
- [Payment-CancelUrl](https://docs.monei.com/apis/rest/schemas/payment-cancelurl/)
