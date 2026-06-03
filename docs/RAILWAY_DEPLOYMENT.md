# Despliegue en Railway

## Error `docker VOLUME ... is not supported`

Railway no permite la instruccion `VOLUME` dentro del `Dockerfile`.

Este proyecto ya no la usa, asi que el despliegue debe hacerse creando el volumen desde Railway.

## Configuracion recomendada

1. Despliega el repositorio usando el `Dockerfile` de la raiz.
2. En Railway, crea un Volume para el servicio.
3. Monta ese Volume en `/app/data`.
4. Si prefieres otra ruta, define la variable `DATA_DIR` con la ruta montada.

La app usa este orden para ubicar SQLite:

1. `DATA_DIR`
2. `RAILWAY_VOLUME_MOUNT_PATH`
3. `./data`

## Permisos

Railway monta los volumes como `root`.

Como esta imagen corre con el usuario `nextjs`, si ves errores de permisos al abrir o escribir `paylink.sqlite`, define esta variable en el servicio:

```env
RAILWAY_RUN_UID=0
```

## Variables minimas

Asegurate de definir al menos:

```env
APP_BASE_URL=https://tu-dominio-publico.up.railway.app
MONEI_API_KEY=pk_live_xxxxx
DEFAULT_NOTIFICATION_EMAIL=operaciones@tu-dominio.com
SMTP_HOST=smtp.tu-dominio.com
SMTP_PORT=587
SMTP_FROM=pagos@tu-dominio.com
```

## Notas para SQLite

- La base se guarda en `paylink.sqlite` dentro del directorio de datos.
- Con el mount path `/app/data`, el archivo quedara en `/app/data/paylink.sqlite`.
- Si no montas un Volume, perderas los datos al redeployar.
