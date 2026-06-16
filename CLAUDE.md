@AGENTS.md

## Working Style
- Scope to task. No adjacent refactors unless asked.

## Commands

```bash
pnpm dev          # Next.js dev server (port 3000)
pnpm build        # production build
pnpm test         # vitest (frontend tests in tests/)
pnpm lint         # eslint
```


## Architecture

Dual-service app: Next.js frontend (Vercel) + FastAPI server (Railway/Docker).

```
app/         Next.js App Router pages
components/  React UI components (DropZone, ControlsBar, OutputCanvas, etc.)
lib/         Conversion logic, canvas rendering, validation, types
server/      FastAPI image-conversion service (Python, separate deploy)
tests/       Vitest frontend tests
```

`@` alias → project root (not `src/`). Configured in `vitest.config.ts` and `tsconfig.json`.

## Environment

| Var | Default | Notes |
|-----|---------|-------|
| `NEXT_PUBLIC_IMAGE2_SERVER_URL` | `http://localhost:8000` | Must be in server's CORS allowlist |
| `NEXT_PUBLIC_APP_VERSION` | `dev` | Set from `VERCEL_GIT_COMMIT_SHA` in `next.config.ts` |

## Gotchas

- Tailwind CSS v4 — no `tailwind.config.*` file; CSS-first config via `globals.css`. Different from v3.
- Frontend (Vercel) + server (Railway) deploy independently — version mismatch shown in footer
- Server CORS allowlist in `server/main.py` — update when adding new frontend origins
- Next.js 16 / React 19 — see AGENTS.md warning about breaking changes