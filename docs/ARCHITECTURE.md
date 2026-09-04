# Architecture — Retablo

Monorepo pnpm (`apps/api`, `apps/web`).

Núcleo B2C: **butacas-sesion**. Una `ShowFunction` es una sesión fechada (Europe/Madrid). El vecino marca butacas del mapa, paga en `POST /api/tickets/checkout` (sin hold TTL) y recibe QR real (`/entrada/:code`). Staff sienta / entreacto / telón. Sweeper cierra funciones `startsAt + durationMin + 40min`.

Puntos = COUNT tickets `ended`. `fromPriceCents` = MIN(zone.priceCents).

Login: panel lateral de marca. JWT namespaced `retablo.jwt`. Auth routes before shell `**`.
