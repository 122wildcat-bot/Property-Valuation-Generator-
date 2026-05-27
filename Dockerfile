FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Chromium for Puppeteer + the fonts and libs it needs to render reliably.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libdrm2 \
    libxss1 \
    ca-certificates \
    dumb-init \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false --no-audit --no-fund

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PORT=3000
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libdrm2 \
    libxss1 \
    ca-certificates \
    dumb-init \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd -r app && useradd -r -g app -G audio,video app \
  && mkdir -p /home/app/Downloads /app \
  && chown -R app:app /home/app /app

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
