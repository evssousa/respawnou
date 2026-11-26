# Imagem de produção para a VPS (Coolify). A Hostinger gerenciada ignora este arquivo.
# Plano e decisões: docs/migracao-vps.md.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --include=dev: o build precisa dos tipos e o Coolify pode passar NODE_ENV=production no build.
# O ffmpeg-static baixa o binário do ffmpeg aqui (postinstall).
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
ARG VITE_SITE_URL=https://respawnou.com.br
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build && npm prune --omit=dev \
 && node -e "require('sharp'); require('node:fs').accessSync(require('ffmpeg-static'))"

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# MEDIA_DIR: imagens e vídeos das matérias ficam num volume (/srv/sites/respawnou/media no servidor).
ENV NODE_ENV=production PORT=3000 MEDIA_DIR=/data/media
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /data/media && chown node:node /data/media
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/robots.txt >/dev/null || exit 1
CMD ["node", "server.js"]
