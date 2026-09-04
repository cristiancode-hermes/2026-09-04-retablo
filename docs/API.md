# API — Retablo

Prefijo `/api`. JWT Bearer.

Auth: `POST /auth/register`, `POST /auth/login` `{ identifier, password }`, `GET /auth/profile`.

Catálogo: `GET /shows`, `GET /shows/:id`, `GET /functions`, `GET /functions/:id`, `GET /functions/:id/seats`, `GET /zones`, `GET /playbills`.

Tickets: `POST /tickets/checkout` `{ functionId, seatIds, playbillQty? }`, `GET /tickets`, `GET /tickets/:id`, `GET /tickets/by-code/:code` (público), `POST /tickets/:id/cancel`.

Staff: `POST /staff/scan`, `GET /staff/today`, `GET /stats/ended?days=14`.

Admin: shows/functions/zones/playbills.

409: `ALREADY_SEATED`, `SEAT_TAKEN`, `FUNCTION_CLOSED`, `NO_PLAYBILL`, `TOO_MANY_SEATS`, `SHOW_CLOSED`.
