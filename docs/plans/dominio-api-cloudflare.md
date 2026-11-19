# Plan: API en `api-wappiz.cantte.com` detrás de Cloudflare

Estado: terminado el 2026-11-19. Solo falta borrar en Cloudflare el registro de `api.wappiz.cantte.com`.

La IaC no crea ni borra dominios propios: se crean con `railway domain <dominio> -p 80 -s api`, se borran con
`railway domain delete <dominio> -s api`, y `.railway/railway.ts` los lista para que coincida con Railway.

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
4. ~~**Activar Cloudflare.**~~ Hecho: SSL/TLS en Full (strict), proxy activo. Bot Fight Mode quedó apagado en
   `cantte.com` (Security → Settings, buscar "Bot fight"): estaba encendido y desafiaba a todo cliente desde un
   datacenter, que es justo quien llama a la API: los runners de GitHub, las funciones de servidor de Vercel
   (el dashboard mostraba "Forbidden") y Meta. En el plan gratuito no se puede excluir un host ni una ruta. Por
   lo mismo, `scripts/railway-deploy.sh` espera el estado del despliegue en Railway y no consulta la URL
   pública.
5. ~~**IP real del cliente.**~~ Hecho: `TRUSTED_PLATFORM: "CF-Connecting-IP"` en `.railway/railway.ts`, aplicado.
   Los logs muestran la IP real del cliente.
6. **Pasar los consumidores al dominio nuevo.**
   - ~~Vercel, entorno Production: `VITE_API_URL=https://api-wappiz.cantte.com`; redesplegar la web.~~ Hecho.
   - ~~GitHub, entorno `prod`: `API_URL=https://api-wappiz.cantte.com`.~~ Hecho.
   - ~~Meta, app de producción: URL de callback `https://api-wappiz.cantte.com/webhook`.~~ Hecho. La verificación
     fallaba siempre porque el handler no recibía `WEBHOOK_VERIFY_TOKEN` (arreglado en #109); el token se
     regeneró.
7. **Retirar el dominio viejo.** Hecho en Railway (`railway domain delete`) y en `.railway/railway.ts`, tras
   comprobar que no recibía tráfico. Falta borrar su registro CNAME en Cloudflare.

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
