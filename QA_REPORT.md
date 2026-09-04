# QA Report — 2026-09-04 Retablo

**Project:** Guiñol de barrio — butaca por función, cobro atómico y QR de entrada
**Stack:** Angular 22 zoneless + NestJS 11 + TypeORM + better-sqlite3 (pnpm)
**Author:** Hermes Daily Builder
**Slug / port:** `retablo` · `3084`
**Live:** https://retablo.proyectos.cristiancode.dev

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| `pnpm --filter ./apps/api test` | PASS | Jest 16/16 |
| `pnpm --filter ./apps/api run build` | PASS | `dist/main.js` |
| `pnpm --filter ./apps/web run build` | PASS | `apps/web/dist/web/browser/index.html` · 276.67 kB initial |
| Design lock | DESIGN_FREE | `check-final-design.sh` |
| Package manager | pnpm | lock + shamefully-hoist |

## ✅ 2. Test Results

16/16 Jest (apps/api/src/retablo.spec.ts) — login email/username, fromPriceCents=min(zones), freeCount list=detail=map, QR real, ALREADY_SEATED, SEAT_TAKEN, TOO_MANY_SEATS, FUNCTION_CLOSED, public timeline, totals, points from ended, staff voice, cancel releases seat, playbill stock, 14d series.

## ✅ 3. Runtime / endpoint smoke

26/26 (4 bash + 22 python) against `localhost:3084` after seed.

| Check | Result |
|-------|--------|
| GET /api/health | 200 |
| POST /api/auth/login email + username + staff | 201 + accessToken |
| GET /api/auth/profile + /me | 200 |
| GET /api/shows fromPriceCents | 800 = min(zones) |
| freeCount list = detail = seats map | 23 |
| POST checkout QR | svg contains `https://retablo.proyectos.cristiancode.dev/entrada/{code}` |
| 409 ALREADY_SEATED / SEAT_TAKEN | PASS |
| GET /api/tickets/by-code/:code public timeline | 200 |
| list totalCents = lines sum | PASS |
| staff scan seated + ALREADY_IN_HALL voz staff | PASS |
| GET /api/stats/ended?days=14 | 14 points with dates |
| GET /api/tickets sin token | 401 |

## ✅ 4. Browser QA (Puppeteer 1280 + 390)

21/21 PASS on production subdomain.

- Home populated (Carmín de Telón, Fraunces, 4 funciones + 4 obras, `desde 8,00 €` from API)
- `/obras/:id` and `/funciones/:id` not blank
- Login panel lateral de marca; creds demo **y** staff `demo1234` debajo; inputs vacíos
- Login demo → token `localStorage.token` → `/mis-entradas` + detalle con timeline + QR
- Público `/entrada/:code` QR real (`data-session-url`) + timeline Pagada/Sentada
- Staff chart Y ticks + tooltips
- 390px sin overflow (`scrollW==clientW`); captions HTML (no SVG `<text>` recortado)
- Console clean
- contraste-hover: `a:hover:not(.btn)`; `.btn-primary:hover` fija `on-primary`; ratios on-primary/primary **8.53**, hover **10.82** (AA)

## ✅ 5. Quality / B2C rules

| Criterion | Verdict |
|-----------|---------|
| Capa de verdad (butacas-sesión + cobro atómico) | PASS |
| Sin hold TTL | PASS |
| QR real `/entrada/:code` | PASS |
| Timeline + tracking destinatario público | PASS |
| fromPriceCents no literal | PASS |
| 409 humano junto al CTA (`#pay-action` único) | PASS (fix QA: id duplicado) |
| TOKEN_KEY=`token` (capture) | PASS (fix QA) |
| Chart ejes/fechas/tooltips | PASS (fix QA: Y ticks) |
| Auth login **antes** del `**` | PASS |
| zoneless + baseHref `/` | PASS |
| Demo staff password visible | PASS |

### Fixes applied in QA
1. `#pay-action` duplicado en checkout (error + botón) → id solo en el CTA
2. `TOKEN_KEY` `retablo.jwt` → `token`
3. Staff chart: Y-axis fractions of max + X labels cada 3 días

### Minor (no bloqueo)
- Badge de estado en `/entrada/:code` muestra `seated` en inglés; la timeline está en español
- Y=0 cuando max=1 (round 0.25)

## ✅ 6. Security Scan

| Check | Result |
|-------|--------|
| Interceptor Bearer (no `***`) | PASS |
| JWT en header solo si hay token | PASS |
| .env gitignored | PASS |
| Protected routes 401 | PASS |

## ✅ 7. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | DONE | `retablo.proyectos.cristiancode.dev` → dist + `/api*` :3084 · HTTPS 200 |
| manage-apis.sh | DONE | port 3084 aligned (69 entries) |
| GitHub | DONE | https://github.com/cristiancode-hermes/2026-09-04-retablo · README 200 |
| Landing | DONE | `name:'retablo'` live 1 |
| Excel | DONE | row 101 Completado |
| Portfolio es/en/pt | DONE | slug `retablo` · heading-263 · date 2026-09-04 |
| Capture config | DONE | config.mjs + prod-capture slug map · tokenField accessToken · loginField identifier |
| Assets | DONE | `/assets/retablo.png` + `-m.png` live 200 |
| Links href/link2/link3 | DONE | 200 / 200 / 200 |

**QR real:** sí · url: `/entrada/:code`

## Summary

**OVERALL: PASS ✅**

Jest 16/16 · smoke 26/26 · browser 21/21 · 0 incidencias graves.
