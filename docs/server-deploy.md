# Server deployment

The FastAPI image conversion server (`server/`) is a separate Python service.
It is excluded from the Vercel build (`.vercelignore`) and ships as its own Docker image.

## Build & run

```bash
cd server
docker build -t image2-server .
docker run -p 8000:8000 image2-server
```

Health check: `GET /health`

## Deploying

Push the `image2-server` image to a host that runs containers (Fly.io, Railway, Render,
a VPS, etc.). The container listens on port 8000 and needs no extra config or secrets.

CORS origins are hardcoded in `server/main.py` (`CORSMiddleware`). Add any new frontend
origin there before deploying.

## Wiring up the Next.js app

Set `IMAGE2_SERVER_URL` to the deployed server's base URL (e.g.
`https://image2-server.fly.dev`) as a Vercel environment variable. The
`/api/convert` route (`app/api/convert/route.ts`) proxies to
`${IMAGE2_SERVER_URL}/convert/:mode`.

Local dev defaults to `http://localhost:8000` if `IMAGE2_SERVER_URL` is unset.
