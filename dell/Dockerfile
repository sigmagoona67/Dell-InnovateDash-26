# syntax=docker/dockerfile:1

# --- Build: compile Vite SPA (config injected at runtime) ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build

# --- Run: stateless nginx serving static assets ---
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

USER root
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /entrypoint.sh
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
RUN chmod +x /entrypoint.sh

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
