# OGCR Operator Platform

Frontend for operators on the OGCR platform: projects, activities, parcels, documents and maps. It talks to the OGCR Operator API ([API docs](https://api-operator.gilab.rs/api/docs/)).

Built with React 19, Vite, Tailwind CSS 4 and MapLibre GL.

## Prerequisites

- Node.js 22 and npm
- Docker, for deployment

## Configuration

Configuration is read from a `.env` file in the project root. `.env` is gitignored. The committed template is `.env.example`:

```sh
cp .env.example .env
```

| Variable       | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| `VITE_API_URL` | Base URL of the OGCR Operator API, e.g. `https://api-operator.gilab.rs/api/` |

`npm run dev` and `npm run build` refuse to start when `VITE_API_URL` is missing.

Vite bakes `VITE_*` values into the JavaScript bundle at build time. After changing the URL, restart the dev server or rebuild the image. Don't put secrets in `.env`, because everything in it ends up in the browser.

## Run locally

```sh
npm ci
cp .env.example .env   # first time only; edit if needed
npm run dev
```

The app runs at http://localhost:3100 and calls `VITE_API_URL` directly. The API's CORS allowlist covers `localhost:3100`, `127.0.0.1:3100` and `localhost:5173`, so use one of those origins.

Other scripts:

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run lint`    | Run ESLint                                       |
| `npm run build`   | Production build into `dist/`                    |
| `npm run preview` | Serve the production build at http://localhost:3200 |

## Deploy

### Docker (recommended)

The [Dockerfile](Dockerfile) builds the app with Node, then serves `dist/` from nginx. [nginx.conf](nginx.conf) adds the SPA fallback, gzip, long-lived caching for hashed assets, and a `/healthz` endpoint that the container healthcheck uses.

Build the image. It uses the `.env` in the project root:

```sh
docker build -t ogcr-operator-platform .
```

On a build server or in CI there is usually no `.env`. Pass the URL as a build argument instead. A build argument also overrides a `.env` if one exists:

```sh
docker build --build-arg VITE_API_URL=https://api-operator.gilab.rs/api/ -t ogcr-operator-platform .
```

Run it:

```sh
docker run -d --name ogcr-operator-platform -p 8080:80 --restart unless-stopped ogcr-operator-platform
```

The app is then served at http://localhost:8080. `curl http://localhost:8080/healthz` returns `ok`.

The API URL is fixed when the image is built. To point at a different API, build a separate image.

Before deploying under a new domain, ask the API team to add that origin to the API's CORS allowlist.

### Static hosting (alternative)

Run `npm run build` with `.env` in place and upload `dist/` to any static host. Configure the host so that unknown paths fall back to `index.html` for client-side routing (see `try_files` in [nginx.conf](nginx.conf)).
