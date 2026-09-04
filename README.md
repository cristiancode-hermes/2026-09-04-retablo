# Retablo

Guiñol de barrio: butaca por función, cobro atómico y QR de entrada.

- Web: Angular 22 zoneless
- API: NestJS + TypeORM + SQLite (Neon-ready)
- Puerto API: 3084
- Demo: `demo@retablo.dev` / `demo1234`
- Staff: `staff@retablo.dev` / `demo1234`

```bash
export PATH="/opt/data/.local/bin:$PATH"
pnpm install
pnpm --filter ./apps/api run build
pnpm --filter ./apps/web run build
pnpm --filter ./apps/api test
```

No arrancar servidores desde el daily builder.
