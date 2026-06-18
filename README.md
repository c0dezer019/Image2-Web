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

The footer shows the server's semver and online/offline status. Server
version is read from `server/VERSION` at startup and returned by
`GET /health` as `{"status": "ok", "version": "..."}`.

Bump `server/VERSION` on every PR that changes server behavior (see
`server/CLAUDE.md` for semver rules).

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

## Running Locally via Docker

Image2-Web can run on your own machine via the [image2 CLI](https://github.com/c0dezer019/image2).

```bash
img2 ui          # spin up and open browser
img2 ui --stop   # tear down
```

When running locally, the server operates in **local mode**:
- Per-IP rate limiting is disabled
- Output size caps (600×600 / 250,000 cells) are lifted
- The version footer shows `local` in place of the server origin

### Manual Docker Compose

```bash
docker compose up -d   # from the image2 repo root
```

The compose stack uses `LOCAL_MODE=true` on the server container. The frontend
image has `http://localhost:8000` baked in as the server URL.

### Session Pre-seed URL Params

The `--ui` flag on `img2 ascii`/`img2 ansi` opens the browser with the image
pre-loaded via URL params:

```
http://localhost:3000?session=<id>&mode=ascii&contrast=1.2&brightness=1.1
```

Supported params: `session`, `mode`, `contrast`, `brightness`, `sharpness`,
`saturate`, `min_lum`, `width`, `palette`.

## Deployment

Frontend deploys to Vercel. Server deploys separately (Docker, e.g.
Fly.io/Railway). See [`docs/server-deploy.md`](docs/server-deploy.md) for
full details on env vars and CORS config.
