# Image2-Web

<img width="1920" height="660" alt="image2_logo" src="https://github.com/user-attachments/assets/8296703b-80a6-4787-9695-25192b0b0d83" />

Web UI to convert images into ASCII or ANSI ("BBS-art") text/grid output.
Drop an image, tweak enhancement params, get live-rendered ASCII/ANSI on a
canvas, export as PNG or text.

This is a GUI implementation for the [image2](https://github.com/c0dezer019/image2)
CLI tool, built with Next.JS and backed by a FastAPI server.

## Examples
<img width="2046" height="2043" alt="hangar_ascii" src="https://github.com/user-attachments/assets/0dfde013-33bb-4d30-b06f-5f725bcaf0b1" />
<img width="2052" height="2050" alt="hanger_ascii" src="https://github.com/user-attachments/assets/e3a2802d-c99e-496e-9c7d-3bdbf9ff5de7" />
<img width="2909" height="1626" alt="image2_ascii" src="https://github.com/user-attachments/assets/9856d07b-9272-4429-b4ff-3345f41ff152" />
<img width="677" height="349" alt="image2_ansi" src="https://github.com/user-attachments/assets/c858a729-1342-4686-a06f-f4a44c03c6ab" />
<img width="570" height="532" alt="hanger_ansi" src="https://github.com/user-attachments/assets/8b78cfdd-995d-412f-b1a0-9370848179b8" />

## Getting Started

Frontend:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Server (required for actual conversions):

```bash
cd server
docker build -t image2-server .
docker run -p 8000:8000 image2-server
```

Health check: `GET http://localhost:8000/health`

By default the frontend talks to `http://localhost:8000`. Set
`NEXT_PUBLIC_IMAGE2_SERVER_URL` to point at a different server (must be in
the server's CORS allowlist — see `server/main.py`).

### Build/deploy versions

The frontend and server get deployed simaltaneously via git workflow, this
can be confirmed by the build SHA's located in the footer of the app that
shows both build versions (`web <sha> · server <sha>`):

- **Frontend**: `NEXT_PUBLIC_APP_VERSION`, set in `next.config.ts` from
  Vercel's `VERCEL_GIT_COMMIT_SHA` (falls back to `dev` locally).
- **Server**: `GET /health` returns `{"status": "ok", "version": "..."}`,
  read from Railway's `RAILWAY_GIT_COMMIT_SHA` (or `IMAGE2_SERVER_VERSION`,
  falling back to `dev`).

If the two don't match a recent commit, the mismatched side hasn't been
redeployed yet and should be done manually.

## Project Structure

```
app/         Next.js App Router pages (page.tsx, layout.tsx)
components/  React components (DropZone, ControlsBar, OutputCanvas, OutputHeader)
lib/         Conversion logic, canvas rendering, validation, theme, types
server/      FastAPI image-conversion service (Python, separate Docker deploy)
docs/        Deployment notes
```

## Scripts

```bash
pnpm dev      # dev server
pnpm build    # production build
pnpm start    # run production build
pnpm lint     # eslint
pnpm test     # vitest
```

## Deployment

Frontend deploys to Vercel. Server deploys separately (Docker, e.g.
Fly.io/Railway). See [`docs/server-deploy.md`](docs/server-deploy.md) for
full details on env vars and CORS config.
