# Despliegue con Docker

## Objetivo

Esta guía explica cómo desplegar **este proyecto completo** con Docker:

- app Next.js en modo producción;
- base SQLite persistente;
- webhook de MONEI operativo;
- variables de entorno externas al contenedor.

## Qué se ha preparado

El repo queda listo para Docker con:

- [Dockerfile](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/Dockerfile)
- [.dockerignore](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/.dockerignore)
- `Next.js standalone output` en [next.config.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/next.config.ts:1)

La imagen expone la app en el puerto `3000` y guarda la base en:

```text
/app/data
```

## Requisitos

Necesitas:

- Docker instalado;
- una URL pública para `APP_BASE_URL`;
- una API key válida de MONEI;
- SMTP configurado si quieres emails automáticos.

## Paso 1. Prepara el archivo de entorno

Crea un `.env.production` o un archivo equivalente fuera del contenedor.

Ejemplo mínimo:

```env
APP_NAME=Paylink Generator
MERCHANT_DISPLAY_NAME=Mi Comercio
APP_BASE_URL=https://pagos.tudominio.com
DEFAULT_CURRENCY=EUR
DEFAULT_ALLOWED_PAYMENT_METHODS=card,bizum,paypal

MONEI_API_KEY=pk_live_xxxxxxxxx
MONEI_ACCOUNT_ID=
MONEI_CALLBACK_PATH=/api/monei/webhook
MONEI_COMPLETE_URL=/result?status=complete
MONEI_FAIL_URL=/result?status=failed
MONEI_CANCEL_URL=/result?status=cancelled

DEFAULT_NOTIFICATION_EMAIL=operaciones@tudominio.com

SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=password
SMTP_FROM=pagos@tudominio.com
SMTP_FROM_NAME=Pagos

EMAIL_SUBJECT_TEMPLATE=Pago confirmado: {{title}}
EMAIL_BODY_TEMPLATE=Se ha confirmado un pago.
```

Notas:

- `APP_BASE_URL` debe ser la URL pública real.
- `MONEI_CALLBACK_PATH` normalmente debe quedarse en `/api/monei/webhook`.
- no metas este archivo dentro de la imagen.

## Paso 2. Construye la imagen

Desde la raíz del proyecto:

```bash
docker build -t paylink-generator:latest .
```

## Paso 3. Crea un volumen para SQLite

La app usa `better-sqlite3` y guarda los datos en `data/paylink.sqlite`.

Para no perder datos al recrear el contenedor:

```bash
docker volume create paylink_generator_data
```

## Paso 4. Arranca el contenedor

Ejemplo recomendado:

```bash
docker run -d \
  --name paylink-generator \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  -v paylink_generator_data:/app/data \
  paylink-generator:latest
```

## Paso 5. Comprueba que ha arrancado

Revisa logs:

```bash
docker logs -f paylink-generator
```

Abre:

```text
http://localhost:3000
```

Si vas a ponerlo en producción detrás de dominio público, normalmente lo servirás detrás de un proxy inverso con HTTPS.

## Paso 6. Configura el dominio público

Para que MONEI pueda llamar al webhook:

- el dominio debe apuntar al servidor;
- debe existir HTTPS válido;
- `APP_BASE_URL` debe coincidir exactamente con esa URL pública.

Ejemplo:

```env
APP_BASE_URL=https://pagos.tudominio.com
```

Entonces el webhook real será:

```text
https://pagos.tudominio.com/api/monei/webhook
```

## Paso 7. Flujo real del webhook en Docker

Dentro del contenedor la app:

1. crea un pago hosted en MONEI;
2. envía `callbackUrl` usando `APP_BASE_URL + MONEI_CALLBACK_PATH`;
3. recibe el webhook en `/api/monei/webhook`;
4. verifica la firma con `MONEI-Signature`;
5. actualiza SQLite en `/app/data/paylink.sqlite`.

Referencia:

- [docs/MONEI_WEBHOOK_SETUP_FOR_THIS_APP.md](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/docs/MONEI_WEBHOOK_SETUP_FOR_THIS_APP.md)

## Persistencia de datos

La base vive en el volumen Docker:

```text
paylink_generator_data:/app/data
```

Eso conserva:

- configuración;
- links creados;
- estados;
- eventos;
- histórico de pagos.

## Actualizar a una nueva versión

Cuando cambies el código:

1. reconstruye la imagen;
2. para el contenedor anterior;
3. lanza uno nuevo con el mismo volumen.

Comandos:

```bash
docker build -t paylink-generator:latest .
docker stop paylink-generator
docker rm paylink-generator
docker run -d \
  --name paylink-generator \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  -v paylink_generator_data:/app/data \
  paylink-generator:latest
```

## Backup de la base SQLite

Puedes copiar la base fuera del volumen así:

```bash
docker run --rm \
  -v paylink_generator_data:/source \
  -v "$(pwd)":/backup \
  busybox \
  sh -c 'cp -r /source /backup/paylink-backup'
```

## Problemas típicos

### El contenedor arranca pero MONEI no actualiza pagos

Revisa:

- `APP_BASE_URL`
- HTTPS público
- acceso externo al webhook
- API key correcta del entorno

### Se pierden datos al recrear el contenedor

Motivo:

- no montaste el volumen `/app/data`.

### El webhook falla en producción pero no en local

Motivo habitual:

- el dominio público de `APP_BASE_URL` no coincide;
- el proxy no reenvía bien;
- el webhook no es accesible desde internet.

### No salen correos

Revisa:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- credenciales SMTP
- `DEFAULT_NOTIFICATION_EMAIL`

## Comando de prueba rápido

Si quieres probarlo todo de una vez:

```bash
docker build -t paylink-generator:latest .
docker volume create paylink_generator_data
docker run -d \
  --name paylink-generator \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  -v paylink_generator_data:/app/data \
  paylink-generator:latest
```

## Archivos implicados

- [Dockerfile](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/Dockerfile)
- [.dockerignore](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/.dockerignore)
- [next.config.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/next.config.ts:1)
- [src/lib/db.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/lib/db.ts:14)
- [src/app/api/monei/webhook/route.ts](/Users/joseignaciopardoperez/Documents/Personal/Proyectos personales/paylink_generator/src/app/api/monei/webhook/route.ts:1)
