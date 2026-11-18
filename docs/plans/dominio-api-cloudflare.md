# Plan: API en `api-wappiz.cantte.com` detrás de Cloudflare

Estado: en curso desde el 2026-11-18. Pasos 1 y 2 hechos; falta el DNS en Cloudflare (paso 3).

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
  - La web en Vercel, desde el servidor (BFF), con `API_URL` y `ORIGIN_SECRET`. La API valida `ORIGIN_SECRET`.
  - Meta, con los webhooks de WhatsApp (callback configurado en la app de Meta de producción).
  - El pipeline, que consulta `${API_URL}/health/ready` (variable `API_URL` del entorno `prod` de GitHub).
- La API no tiene `TRUSTED_PROXIES` ni `TRUSTED_PLATFORM`. Detrás de Cloudflare vería IPs de Cloudflare y los
  límites por IP (`pkg/server/middleware_ratelimit.go`) tratarían a todos los clientes como uno.

## Decisiones

| Tema | Decisión |
|---|---|
| Migración | Convivencia: el dominio nuevo se suma al actual; el viejo se retira tras unos 7 días sin tráfico. |
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
4. **Activar Cloudflare.** Modo SSL/TLS en Full (strict); activar el proxy del registro. No activar Bot Fight Mode.
5. **IP real del cliente.** `TRUSTED_PLATFORM: "CF-Connecting-IP"` en `.railway/railway.ts` y
   `railway config apply` (provoca un redeploy).
6. **Pasar los consumidores al dominio nuevo.**
   - Vercel, entorno Production: `API_URL=https://api-wappiz.cantte.com`; redesplegar la web.
   - GitHub, entorno `prod`: `API_URL=https://api-wappiz.cantte.com`.
   - Meta, app de producción: URL de callback del webhook al dominio nuevo; Meta la verifica con
     `WEBHOOK_VERIFY_TOKEN`.
7. **Retirar el dominio viejo.** Unos 7 días después, si los logs HTTP de Railway
   (`railway logs --http --filter '@host:api.wappiz.cantte.com'`) no muestran tráfico, quitar
   `api.wappiz.cantte.com` de `.railway/railway.ts`, aplicar (`plan` debe mostrarlo como eliminación) y borrar su
   registro en Cloudflare.

## Verificación

- `curl -sI https://api-wappiz.cantte.com/health/ready` responde 200 con la cabecera `cf-ray`.
- `curl -sI https://wappiz-api-production.up.railway.app` ya no responde.
- Iniciar sesión y hacer una acción real en la web funciona.
- Un mensaje de WhatsApp llega al webhook y se procesa.
- Los logs de la API muestran IPs reales de clientes, no rangos de Cloudflare.
- El siguiente push a `main` pasa el paso "Wait for the new revision" con el dominio nuevo.

## Riesgos

- **Cabecera falsificada.** Una petición que llegue a Railway sin pasar por Cloudflare puede traer un
  `CF-Connecting-IP` falso y esquivar los límites por IP. Mitigación: no dejar dominios `*.up.railway.app`
  públicos en la API; el BFF ya exige `ORIGIN_SECRET`.
- **Webhooks perdidos** durante el cambio de URL en Meta: por eso conviven los dos dominios.

## Quién hace qué

- Agente: pasos de Railway y GitHub por CLI, y Vercel si hay sesión.
- Responsable del proyecto: paneles de Cloudflare y Meta.
