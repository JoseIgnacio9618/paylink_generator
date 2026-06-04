# Guia de configuracion de MONEI para Paylink Generator

## Objetivo

Esta guia deja documentado todo lo que hay que configurar en MONEI para que esta app funcione con el menor numero posible de restricciones evitables.

Importante: "sin restricciones" no puede garantizarse al 100%. Aunque la cuenta este bien configurada, MONEI sigue decidiendo los metodos disponibles segun importe, moneda, pais, estado de la cuenta, metodo activado y reglas del banco emisor. La meta realista es quitar las restricciones de configuracion, no las regulatorias o bancarias.

## Resumen rapido

Para que la app funcione bien en produccion necesitas:

1. Tener la cuenta live de MONEI aprobada y operativa.
2. Usar la API key correcta para el modo en uso: `pk_test_*` en pruebas y `pk_live_*` en produccion.
3. Tener una `Base URL` publica y accesible por HTTPS para recibir el webhook.
4. Configurar en MONEI los metodos de pago que quieras usar de verdad.
5. Verificar los metodos disponibles con la API `allowed-payment-methods` en vez de asumir que un metodo siempre estara disponible.
6. Si quieres cobrar mas de `4.000 EUR` con tarjeta, pedir a soporte de MONEI que suba el limite por defecto.

## 1. Estado de la cuenta MONEI

### 1.1 Cuenta live aprobada

Antes de esperar que todos los metodos aparezcan en produccion, la cuenta live debe haber completado onboarding, contrato y aprobacion operativa. En test mode puedes probar antes, pero las credenciales y la configuracion de metodos no son las mismas.

### 1.2 No mezclar test y live

MONEI separa claramente test mode y live mode:

- La API key de test y la de live son distintas.
- El `Account ID` de test y el de live tambien son distintos.
- La configuracion de metodos de pago puede diferir entre ambos modos.

Para esta app:

- `MONEI_API_KEY` debe ser la clave del modo que estes usando.
- `MONEI_ACCOUNT_ID` es opcional en este proyecto y solo hace falta en escenarios avanzados de cuentas conectadas o trabajo "on behalf of".

### 1.3 Como llega el dinero de MONEI a tu cuenta bancaria

Es importante distinguir tres cosas distintas:

- `charge`: el cliente te paga;
- `refund`: devuelves total o parcialmente un pago al cliente;
- `settlement`: MONEI liquida saldo de comerciante y lo transfiere a tu cuenta bancaria.

En el flujo normal de este proyecto, esta app:

- crea cobros en MONEI;
- recibe el webhook del pago;
- puede consultar estados;
- y puede solicitar refunds.

Pero esta app **no inicia una retirada manual a tu banco**. Lo que ocurre, segun la documentacion publica de MONEI revisada el `2026-06-04`, es que las liquidaciones se envian al `IBAN` configurado en tu cuenta de comerciante. MONEI documenta que una liquidacion con estado `COMPLETED` produce una unica transferencia bancaria al `iban` de destino.

Consecuencia practica:

- para "sacar el dinero" a tu banco no usas esta app;
- debes tener correctamente configurado en MONEI el `IBAN` de liquidacion de tu cuenta;
- y despues esperar la liquidacion normal de MONEI.

Si quieres comprobar que ya se ha enviado al banco, la referencia tecnica correcta en MONEI no es un `refund`, sino una `settlement`:

- `SETTLEMENT_PENDING` indica liquidacion pendiente;
- `SETTLEMENT_COMPLETED` indica que la liquidacion ya se ha transferido a la cuenta bancaria del comercio.

Importante:

- esto no es lo mismo que la API `PAYOUT`;
- `PAYOUT` en MONEI sirve para enviar dinero a terceros por Bizum o tarjeta y, segun la documentacion oficial, sigue en beta cerrada;
- no es el mecanismo normal para retirar tus propios cobros a tu cuenta bancaria.

## 2. URLs publicas y webhook

### 2.1 Base URL publica

Esta app crea pagos hosted y depende del webhook de MONEI para marcar el estado definitivo del pago. Por eso la `Base URL` debe ser publica.

Configuracion recomendada:

- `APP_BASE_URL=https://tu-dominio.com`
- `MONEI_CALLBACK_PATH=/api/monei/webhook`

La URL final del webhook sera:

```text
https://tu-dominio.com/api/monei/webhook
```

### 2.2 Callback URL en los pagos

La app envia `callbackUrl` al crear cada pago. MONEI usa esa URL para mandar el resultado definitivo del pago por webhook.

Si la URL no es publica, si falla el SSL o si responde mal, el pago puede quedar visible en MONEI pero no sincronizarse bien en tu base de datos.

### 2.3 Firma del webhook

La validacion correcta del header `MONEI-Signature` es obligatoria. MONEI firma los webhooks con HMAC SHA-256 y la clave API de la cuenta.

En esta app ya esta implementado, pero operativamente debes comprobar:

- que la API key guardada en la app corresponde al mismo modo del pago;
- que el webhook recibe el cuerpo raw correcto;
- que el endpoint responde `200 OK` cuando procesa bien el evento.

## 3. Metodos de pago que debes activar en MONEI

### 3.1 Tarjeta (`card`)

Para aceptar tarjeta necesitas:

- al menos un card processor configurado;
- tener el metodo habilitado en `MONEI Dashboard -> Settings -> Payment Methods -> Card payments`.

Restriccion importante:

- MONEI documenta un limite maximo por defecto de `4.000 EUR` por transaccion con tarjeta.
- Ese limite se puede aumentar, pero hay que pedirlo al soporte de MONEI.

Consecuencia practica para esta app:

- si intentas crear un pago de `4.000,01 EUR` o superior, `card` puede desaparecer de los metodos permitidos aunque el checkbox siga marcado en la interfaz;
- eso no significa que el formulario este roto, sino que MONEI ha descartado `card` para ese importe.

### 3.2 Bizum (`bizum`)

Para aceptar Bizum:

- la cuenta debe estar completamente aprobada;
- Bizum se activa automaticamente en unos `2-3 dias laborables` de media;
- si despues de `7 dias` no aparece, hay que abrir ticket a soporte;
- si tu web esta protegida o no es accesible publicamente durante el onboarding, MONEI puede no activar Bizum automaticamente.

Importante sobre limites:

- el limite clasico de `1.000 EUR` que mucha gente conoce corresponde a Bizum entre particulares;
- para compras online, MONEI documenta que Bizum no tiene un maximo general de importe;
- aun asi, una operacion puede fallar por limites del banco emisor o fondos insuficientes.

### 3.3 PayPal (`paypal`)

Para aceptar PayPal:

- debes conectar tu cuenta de negocio de PayPal en `MONEI Dashboard -> Settings -> Payment Methods`.

Si PayPal no esta conectado, marcar `paypal` en la app no sirve: MONEI lo omitira al preparar el checkout.

### 3.4 Google Pay (`googlePay`)

Para aceptar Google Pay en condiciones:

- necesitas al menos un card processor activo;
- debes tener Google Pay habilitado en `MONEI Dashboard -> Settings -> Payment Methods`;
- la aplicacion debe servirse por HTTPS.

En hosted payment page no requiere una integracion custom adicional, pero sigue dependiendo de que tarjeta y Google Pay esten habilitados para tu cuenta.

Importante en `test mode`:

- MONEI documenta que para Google Pay web puedes usar tarjetas reales guardadas en Chrome y que **no se cobraran**;
- en ese modo, MONEI indica que los datos de la tarjeta se **sustituyen automaticamente por una tarjeta de prueba**;
- por eso, al probar Google Pay en entorno de pruebas, el resultado final puede comportarse como un test de tarjeta y no como una autorizacion "real" de wallet.

Fuente oficial:

- [MONEI Google Pay](https://docs.monei.com/payment-methods/google-pay/)

### 3.5 Apple Pay (`applePay`)

Para este proyecto, que usa la hosted payment page de MONEI, Apple Pay no requiere configuracion extra de checkout custom.

Si en el futuro pasas a un dominio propio o a una integracion directa, tendras que:

- registrar el dominio con Apple Pay;
- servir el dominio por HTTPS con certificado valido.

### 3.6 Click to Pay (`clickToPay`)

Click to Pay:

- solo esta disponible en Hosted Payment Page y Payment Modal;
- requiere activacion por parte de soporte de MONEI.

Esta app si puede aprovecharlo porque crea hosted payments, pero no aparecera hasta que soporte lo habilite en la cuenta.

### 3.7 Otros metodos soportados por la app

La app tambien puede manejar estos codigos si MONEI los devuelve:

- `alipay`
- `bancontact`
- `blik`
- `eps`
- `giropay`
- `iDeal`
- `klarna`
- `mbway`
- `multibanco`
- `sepa`
- `sofort`
- `srtp`
- `trustly`

Pero su disponibilidad depende de:

- pais del cliente;
- moneda;
- configuracion del merchant;
- acuerdos concretos de MONEI para tu cuenta.

No conviene asumir que todos pueden activarse solo por marcar una casilla en la app.

## 4. Que guardar en la configuracion de esta app

Estas son las variables y ajustes que debes alinear con MONEI:

| Campo en la app | Valor esperado |
| --- | --- |
| `MONEI_API_KEY` | API key del modo actual, obtenida en `Dashboard -> Settings -> API Access` |
| `MONEI_ACCOUNT_ID` | Normalmente vacio en este proyecto; solo usar si operas con cuentas conectadas |
| `APP_BASE_URL` | Dominio publico real donde vive la app |
| `MONEI_CALLBACK_PATH` | Normalmente `/api/monei/webhook` |
| `MONEI_COMPLETE_URL` | URL final de exito opcional |
| `MONEI_FAIL_URL` | URL final de fallo opcional |
| `MONEI_CANCEL_URL` | URL final de cancelacion opcional |
| `MERCHANT_DISPLAY_NAME` | Nombre comercial que quieres mostrar en checkout |
| `DEFAULT_ALLOWED_PAYMENT_METHODS` | Solo metodos que tengas realmente activados en tu cuenta |

Recomendacion:

- no dejes `DEFAULT_ALLOWED_PAYMENT_METHODS` con metodos "aspiracionales";
- guarda solo los que ya existan en tu cuenta live o test;
- el alta de metodos adicionales debe hacerse primero en MONEI.

## 4.1 Resumen operativo sobre banco y liquidaciones

Si tu duda operativa es "como cobro yo ese dinero en mi banco", el flujo correcto es este:

1. El cliente paga en MONEI.
2. MONEI marca el pago como cobrado.
3. MONEI agrupa operaciones en una `settlement`.
4. Cuando la liquidacion queda `COMPLETED`, MONEI envia una transferencia bancaria al `IBAN` configurado para esa cuenta.

Por tanto, antes de salir a produccion conviene revisar en tu cuenta MONEI:

- que el `IBAN` de liquidacion sea el correcto;
- que la cuenta live este aprobada;
- que no haya bloqueos operativos o de cumplimiento;
- y que puedas ver eventos o movimientos de tipo `settlement`.

Si necesitas enviar dinero activamente a otra persona o empresa, eso ya no es una liquidacion de comerciante sino un `PAYOUT`, y entra en otro producto distinto.

## 5. Como trabaja esta app con los metodos de pago

Esta app no se fia solo de lo que selecciones en el formulario.

Antes de crear un pago:

1. Consulta a MONEI los metodos permitidos para ese checkout concreto.
2. Cruza esa respuesta con los metodos marcados en la interfaz.
3. Crea el pago solo con la interseccion de ambos conjuntos.

Eso significa que un metodo puede estar:

- activo en la configuracion general de la cuenta;
- visible en una pantalla del panel;
- pero no disponible para un pago concreto por importe, moneda o pais.

## 6. Observacion real de esta cuenta

En este proyecto, el `2026-05-30`, la cuenta devolvio:

- para `4.000,00 EUR`: `bizum`, `googlePay`, `card`;
- para `4.000,01 EUR`: solo `bizum`;
- para `20.000,00 EUR`: solo `bizum`.

Esto coincide con la documentacion oficial de MONEI sobre el limite por defecto de tarjeta de `4.000 EUR`.

## 6.1 Observacion real sobre Google Pay en esta cuenta de prueba

En esta integracion, al probar Google Pay en `test mode`, el payload final observado para un pago devolvio:

- `paymentMethod.method = card`
- `last4 = 4406`
- `threeDSecureStatus = Y`
- `status = FAILED`
- `statusCode = E200`

Lectura practica:

- el challenge o 3DS puede terminar bien;
- eso **no garantiza** que la autorizacion final del pago se apruebe;
- `E200` significa que la transaccion fallo durante el procesamiento, pero **no da una razon mas precisa**;
- por tanto, un `cr=SUCCESS` en la URL del `challenge` solo confirma que la autenticacion termino, no que el cobro quedo aprobado.

Lo que si puede afirmarse con seguridad por documentacion oficial:

- `CHALLENGE` es solo la fase 3DS o del banco;
- `COMPLETE` es la redireccion final;
- el estado final autoritativo sigue siendo el `status` del `Payment` (`SUCCEEDED`, `FAILED`, etc.);
- `E200` es un error generico de procesamiento.

Fuentes oficiales:

- [MONEI NextActionTypes](https://docs.monei.com/apis/graphql/types/enums/next-action-types/)
- [MONEI Payments status codes](https://docs.monei.com/apis/rest/payments/)

Nota:

- que Google Pay de prueba se haya sustituido aqui por una tarjeta terminada en `4406` es una **inferencia basada en el payload observado en esta cuenta**, no una afirmacion explicita de la documentacion de MONEI sobre que siempre use exactamente esa tarjeta.

## 6.2 Como probar correctamente en test mode

Si quieres pruebas controladas y reproducibles, usa los datos oficiales de testing de MONEI en lugar de improvisar tarjetas:

### Tarjetas de prueba oficiales

Para todas las tarjetas de prueba:

- expiracion `12/34`
- CVC `123`

Tarjetas oficiales documentadas por MONEI:

- `4444444444444406` -> Visa, `3D Secure v2.1 Challenge`
- `4444444444444414` -> Visa, `3D Secure v2.1 Direct (no challenge)`
- `4444444444444422` -> Visa, `3D Secure v2.1 Frictionless`
- `4444444444444430` -> Visa, `3D Secure v2.1 Frictionless and Challenge`
- `5555555555555524` -> Mastercard, `3D Secure v2.1 Direct (no challenge)`
- `5555555555555532` -> Mastercard, `3D Secure v2.1 Frictionless`
- `5555555555555565` -> Mastercard, `3D Secure v2.1 Challenge`
- `5555555555555573` -> Mastercard, `3D Secure v2.1 Frictionless and Challenge`

### Bizum de prueba

MONEI documenta para Bizum en test:

- telefono: `+34500000000`
- por debajo de `5 EUR` -> `E000` aprobado
- entre `5 EUR` y `10 EUR` -> `E506`
- entre `10 EUR` y `15 EUR` -> `E000` en flujo redirect
- por encima de `15 EUR` -> telefono no registrado

Y ademas advierte:

- en entorno de pruebas, Bizum solo soporta operaciones por debajo de `5 EUR`

### PayPal de prueba

Cuentas oficiales documentadas por MONEI:

- business: `paypal-business@monei.net` / `monei12345`
- personal: `paypal-personal@monei.net` / `monei12345`
- fallo simulado: `CCREJECT-REFUSED@paypal.com` / `PayPal2016`

En la cuenta de fallo simulado, MONEI documenta que:

- PayPal Credit y la tarjeta terminada en `1111` dentro del wallet producen exito;
- el resto de tarjetas del wallet producen rechazo.

### Recomendacion operativa para esta app

Para aislar problemas, prueba en este orden:

1. `card` puro con una de las tarjetas oficiales de MONEI.
2. `bizum` con importe `< 5 EUR` y telefono de prueba oficial.
3. `paypal` con las cuentas sandbox oficiales.
4. `googlePay` solo cuando ya hayas validado que tarjeta normal funciona, sabiendo que en test mode MONEI sustituye la tarjeta real por una de prueba.

Con eso distingues mucho mejor:

- fallos de metodo concreto;
- efectos del challenge 3DS;
- y confusiones propias de wallet/test mode.

## 7. Checklist de puesta en marcha sin bloqueos evitables

### Basico

- Cuenta live aprobada.
- API key correcta para el modo correcto.
- `APP_BASE_URL` publica y por HTTPS.
- Webhook funcional en `/api/monei/webhook`.
- Respuesta `200 OK` desde el webhook.

### Tarjeta

- Card processor configurado.
- Card payments habilitado en Dashboard.
- Solicitud a soporte si necesitas mas de `4.000 EUR` por operacion.

### Bizum

- Cuenta aprobada.
- Web accesible publicamente durante el onboarding.
- Bizum visible en Dashboard.
- Ticket a soporte si no aparece despues del plazo normal.

### PayPal

- Cuenta business de PayPal conectada.

### Wallets

- Google Pay habilitado.
- Apple Pay validado si usas dominio propio o integracion directa.
- Click to Pay activado por soporte si lo quieres usar.

### Operacion

- Verificacion del webhook con `MONEI-Signature`.
- No asumir metodos por defecto: consultar siempre `allowed-payment-methods`.
- Probar importes altos en test y luego en live antes de salir a produccion.

## 8. Cosas que no dependen de tu configuracion

Aunque todo este bien montado, pueden seguir existiendo restricciones ajenas a tu configuracion:

- limites del banco emisor;
- fondos insuficientes del cliente;
- moneda no soportada para cierto metodo;
- pais no compatible;
- reglas de riesgo o SCA;
- disponibilidad parcial de ciertos metodos en funcion del merchant.

Por eso la regla correcta de producto es esta:

- configura en MONEI todo lo que quieras habilitar;
- pero deja que MONEI tenga la ultima palabra por pago usando `allowed-payment-methods`.

## 9. Fuentes oficiales

- [MONEI Payment Methods API](https://docs.monei.com/apis/rest/payment-methods/)
- [MONEI AccountSettlement](https://docs.monei.com/es/apis/graphql/types/objects/account-settlement/)
- [MONEI Webhook Event Types](https://docs.monei.com/apis/graphql/types/enums/webhook-event-type/)
- [MONEI Payouts beta](https://docs.monei.com/es/guides/payouts/)
- [MONEI Cards](https://docs.monei.com/payment-methods/card/)
- [MONEI Bizum](https://docs.monei.com/payment-methods/bizum/)
- [MONEI PayPal](https://docs.monei.com/payment-methods/paypal/)
- [MONEI Google Pay](https://docs.monei.com/payment-methods/google-pay/)
- [MONEI Apple Pay](https://docs.monei.com/payment-methods/apple-pay/)
- [MONEI Click to Pay](https://docs.monei.com/payment-methods/click-to-pay/)
- [MONEI Testing](https://docs.monei.com/testing/)
- [MONEI Verify Signature](https://docs.monei.com/guides/verify-signature/)
- [MONEI Testing](https://docs.monei.com/docs/testing/)
- [Apple Pay Domain API](https://docs.monei.com/apis/rest/apple-pay-domain/)
- [Bizum FAQ sobre limites](https://bizum.com/es/en/faqs/has-any-limit/)
