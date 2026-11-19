# Plan: API en `api-wappiz.cantte.com` detrás de Cloudflare

Estado: en curso desde el 2026-11-18. Hechos los pasos 1 a 5 y la parte de GitHub del 6; faltan Vercel y Meta, y
retirar el dominio viejo.

Los dominios propios no se pueden crear desde la IaC (`railway config` lo rechaza): se crean con
`railway domain <dominio> -p 80 -s api` y después se listan en `.railway/railway.ts` para que `plan` no los
borre.

## Contexto

- La API de producción responde en `api.wappiz.cantte.com`, con el registro en Cloudflare en modo solo DNS
  (CNAME a `0ac2losw.up.railway.app`). El certificado gratuito de Cloudflare (Universal SSL) cubre solo un nivel
  de subdominio (`*.cantte.com`), así que ese dominio no puede pasar por el proxy sin un certificado avanzado de
  pago. `api-wappiz.cantte.com` sí queda cubierto.
- Producción además expone `wappiz-api-production.up.railway.app` apuntando al puerto 9090: las métricas de
  Prometheus son públicas.
- Quién llama a la API:
  - La web en Vercel, desde el navegador, con `VITE_API_URL` (se incrusta en el build). Todavía no hay BFF ni
    comprobación de origen: `ORIGIN_SECRET` está en Railway, pero nadie lo lee.
  - Meta, con los webhooks de WhatsApp (callback configurado en la app de Meta de producción).
  - El pipeline, que consulta `${API_URL}/health/ready` (variable `API_URL` del entorno `prod` de GitHub).
- La API no tiene `TRUSTED_PROXIES` ni `TRUSTED_PLATFORM`. Detrás de Cloudflare vería IPs de Cloudflare y los
  límites por IP (`pkg/server/middleware_ratelimit.go`) tratarían a todos los clientes como uno.

## Decisiones

| Tema | Decisión |
|---|---|
| Migración | El dominio viejo se retira en cuanto Vercel y Meta usan el nuevo, sin esperar los 7 días (decidido el 2026-11-18): mientras exista, permite falsificar `CF-Connecting-IP`. |
| IP del cliente | `TRUSTED_PLATFORM=CF-Connecting-IP` al activar el proxy. |
| Protección de Cloudflare | Solo el proxy, con la protección DDoS y las reglas por defecto. Sin Bot Fight Mode: en el plan gratuito no se puede excluir una ruta y puede bloquear los webhooks de Meta. |
| SSL | Full (strict). El proxy se activa después de que Railway emita el certificado. |
| Métricas en 9090 | Se elimina el dominio `wappiz-api-production.up.railway.app`. |

## Pasos

1. ~~**Cerrar las métricas públicas.**~~ Hecho: el dominio `wappiz-api-production.up.railway.app` ya no existe
   (Railway responde 404 con `x-railway-fallback: true`).
2. ~~**Agregar el dominio.**~~ Hecho: `api-wappiz.cantte.com`, puerto 80. Registros que pide Railway:
   - CNAME `api-wappiz` → `0t96a5vl.up.railway.app`
   - TXT `_railway-verify.api-wappiz` →
     `railway-verify=f5694892d9e86deb6e17536eadd22c626da921dfb5d7a90f4fff62ccb38ce2ee`
3. **DNS sin proxy.** En Cloudflare, crear los dos registros anteriores, el CNAME en modo solo DNS. Esperar a que
   `railway domain status 4513d9ef-ac4c-4d3b-a6f2-f25e0c59c5a6` muestre el dominio verificado y el certificado
   emitido.
4. **Activar Cloudflare.** Modo SSL/TLS en Full (strict); activar el proxy del registro. Bot Fight Mode debe
   quedar apagado (Security → Settings, buscar "Bot fight"): estaba encendido en `cantte.com` y respondía 403 al
   paso "Wait for the new revision" desde los runners de GitHub.
5. ~~**IP real del cliente.**~~ Hecho: `TRUSTED_PLATFORM: "CF-Connecting-IP"` en `.railway/railway.ts`, aplicado.
   Los logs muestran la IP real del cliente.
6. **Pasar los consumidores al dominio nuevo.**
   - Vercel, entorno Production: `VITE_API_URL=https://api-wappiz.cantte.com`; redesplegar la web (la variable se
     lee en el build).
   - ~~GitHub, entorno `prod`: `API_URL=https://api-wappiz.cantte.com`.~~ Hecho.
   - Meta, app de producción: URL de callback del webhook al dominio nuevo; Meta la verifica con
     `WEBHOOK_VERIFY_TOKEN`.
7. **Retirar el dominio viejo.** En cuanto Vercel y Meta usen el nuevo, y si los logs HTTP de Railway
   (`railway logs --http --filter '@host:api.wappiz.cantte.com'`) no muestran tráfico, quitar
   `api.wappiz.cantte.com` de `.railway/railway.ts`, aplicar (`plan` debe mostrarlo como eliminación) y borrar su
   registro en Cloudflare.

## Verificación

- `curl -sD - https://api-wappiz.cantte.com/health/ready` responde 200 con la cabecera `cf-ray` (la ruta solo
  acepta GET: `curl -I` da 404).
- `curl -sI https://wappiz-api-production.up.railway.app` ya no responde.
- Iniciar sesión y hacer una acción real en la web funciona.
- Un mensaje de WhatsApp llega al webhook y se procesa.
- Los logs de la API muestran IPs reales de clientes, no rangos de Cloudflare.
- El siguiente push a `main` pasa el paso "Wait for the new revision" con el dominio nuevo.

## Riesgos

- **Cabecera falsificada.** Una petición que llegue a Railway sin pasar por Cloudflare puede traer un
  `CF-Connecting-IP` falso y esquivar los límites por IP. Mitigación: no dejar dominios `*.up.railway.app`
  públicos en la API. Mientras no exista la comprobación de origen, nada impide llamar a Railway directamente
  con el `Host` de la API; el riesgo queda acotado a los límites por IP.
- **Webhooks perdidos** durante el cambio de URL en Meta: por eso el dominio viejo se quita después del cambio.

## Quién hace qué

- Agente: pasos de Railway y GitHub por CLI, y Vercel si hay sesión.
- Responsable del proyecto: paneles de Cloudflare y Meta.
