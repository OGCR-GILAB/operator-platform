# Build stage: compile the Vite app
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Base URL of the operator API, baked into the bundle at build time. Read from .env in
# the build context, or from `--build-arg VITE_API_URL=...`, which takes precedence.
ARG VITE_API_URL
RUN npm run build

# Runtime stage: static files served by nginx with SPA fallback
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
