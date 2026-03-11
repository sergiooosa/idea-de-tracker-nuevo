# Despliegue en Coolify con Traefik (subdominios comodín)

Esta guía configura **un solo contenedor** para que atienda tanto el dominio raíz (`autokpi.net`) como **cualquier** subdominio (`*.autokpi.net`). El middleware de la app se encarga del enrutamiento por tenant; Traefik solo debe enviar todo el tráfico al mismo puerto.

## Por qué el campo "Domains" de Coolify no basta

El campo **Domains** de Coolify no actúa como un verdadero *catch-all* para SaaS multi-tenant. Si pones `*.autokpi.net`, Traefik puede interpretarlo de forma literal y no hacer match con peticiones como `testv1.autokpi.net`, lo que produce **503 No available server**.

La solución es **dejar Domains vacío** y definir las reglas de Traefik con **Custom Labels** (expresión regular). Así Traefik enruta explícitamente `autokpi.net` y cualquier `*.autokpi.net` al mismo servicio.

---

## Paso 1: Dejar el campo Domains vacío

1. En Coolify: **Tu proyecto** → **Tu aplicación** → **Configuration** → **General**.
2. En **Domains**, borra todo y déjalo **completamente vacío**. Guarda.

---

## Paso 2: Custom Labels (Traefik)

En la misma configuración, busca **Custom Labels** (puede estar en *Advanced* o más abajo en *General*). Añade **cada línea** como una etiqueta separada (según cómo Coolify permita añadir labels; si es un bloque de texto, una por línea en formato `clave=valor`):

```ini
traefik.enable=true
traefik.http.routers.autokpi-catchall.rule=Host(`autokpi.net`) || Host(`www.autokpi.net`) || HostRegexp(`^.+\.autokpi\.net$`)
traefik.http.routers.autokpi-catchall.entrypoints=http
traefik.http.routers.autokpi-catchall.service=autokpi-catchall
traefik.http.services.autokpi-catchall.loadbalancer.server.port=3000
```

**Significado:**

| Label | Función |
|-------|--------|
| `traefik.enable=true` | Activa Traefik para este contenedor. |
| `rule=Host(...) \|\| HostRegexp(...)` | Dominio raíz, `www` y cualquier subdominio `*.autokpi.net` van a este servicio. |
| `entrypoints=http` | Tráfico HTTP (puerto 80). Si Cloudflare termina SSL y habla por HTTP con el VPS, esto es correcto. |
| `service=autokpi-catchall` | Asocia el router al servicio definido abajo. |
| `loadbalancer.server.port=3000` | Puerto que expone la app dentro del contenedor (el Dockerfile usa `EXPOSE 3000` y `PORT=3000`). Si en Coolify expones otro puerto interno, cambia `3000` por ese valor. |

**Si tu dominio raíz no es `autokpi.net`:** sustituye `autokpi.net` en la regla por tu dominio (en los tres sitios: `Host`, `www` y dentro de `HostRegexp`).

---

## Paso 3: Variables de entorno en Coolify

Asegúrate de que la aplicación tenga estas variables en el entorno de **producción** (Coolify → tu app → Environment / Variables):

| Variable | Valor | Notas |
|----------|--------|--------|
| `AUTH_URL` | `https://autokpi.net` | Siempre el dominio raíz con `https`. |
| `AUTH_TRUST_HOST` | `true` | **Obligatorio** detrás de Traefik/proxy. |
| `AUTH_SECRET` | *(generado con `openssl rand -base64 32`)* | Para firmar JWTs. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `autokpi.net` | Debe coincidir con el dominio raíz (sin `https://`). |
| `DATABASE_URL` | `postgresql://...` | Conexión a PostgreSQL. |
| `NEXT_PUBLIC_API_BASE_URL` | `https://autokpi.net` | Opcional; si no se define, la app usa `AUTH_URL` para webhooks/integraciones. |

El Dockerfile define por defecto `AUTH_URL` y `NEXT_PUBLIC_ROOT_DOMAIN` en **build time**; en Coolify es recomendable **sobrescribirlos en runtime** con las variables de entorno anteriores para no depender del valor embebido en la imagen.

---

## Paso 4: Puerto expuesto

El contenedor debe exponer el puerto **3000** (o el que hayas puesto en la label `loadbalancer.server.port`). En Coolify, en **Ports Exposes** (o equivalente), confirma que el puerto interno de la app es **3000**. Si Coolify mapea otro puerto interno, usa ese mismo número en la última label (`traefik.http.services.autokpi-catchall.loadbalancer.server.port=...`).

---

## Paso 5: Despliegue

1. **Save** en la configuración.
2. Lanza **Deploy** (o Force Rebuild si cambiaste solo labels/env).

---

## Cloudflare (proxy naranja)

Con el proxy de Cloudflare activado (candado naranja), el flujo es:

- Usuario → HTTPS → Cloudflare → HTTP → Traefik (puerto 80) → contenedor (3000).

`entrypoints=http` es correcto porque Traefik recibe HTTP desde Cloudflare.

**SSL comodín:** En el plan gratuito de Cloudflare a veces hay limitaciones con certificados para `*.autokpi.net` cuando está proxyado. Si tras el deploy ves errores como `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` en subdominios, opciones:

- Probar con el proxy en gris (solo DNS) y que el SSL lo resuelva el servidor (p. ej. Let's Encrypt en Traefik), o  
- Revisar si tu plan de Cloudflare permite SSL comodín en modo proxy (suele estar en planes de pago).

---

## Comprobar que funciona

1. **Dominio raíz:** `https://autokpi.net` → debe cargar la landing; `https://autokpi.net/login` → login.
2. **Subdominio sin sesión:** `https://testv1.autokpi.net` → debe redirigir a `https://autokpi.net/login`.
3. **Subdominio con sesión:** tras iniciar sesión, debes ser redirigido a `https://[subdominio].autokpi.net/dashboard` y la app debe cargar.

Si sigues viendo **503**:

- Revisa que las Custom Labels estén aplicadas al contenedor que realmente sirve la app:  
  `docker inspect <container_id> | grep -i traefik`
- Comprueba que la regla incluya `HostRegexp(`^.+\.autokpi\.net$`)` y que el `server.port` sea 3000 (o el que use tu app).

---

## Resumen

- **Domains** en Coolify: vacío.  
- **Custom Labels:** regla Traefik con `Host(`autokpi.net`)` + `HostRegexp(`^.+\.autokpi\.net$`)` y `server.port=3000`.  
- **Env:** `AUTH_URL`, `AUTH_TRUST_HOST`, `NEXT_PUBLIC_ROOT_DOMAIN` (y el resto) configurados en Coolify.  
- La app (middleware) recibe el header `Host` correcto y enruta por tenant; no hace falta lista de subdominios en Traefik.
