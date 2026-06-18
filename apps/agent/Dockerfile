FROM node:20-slim

RUN apt-get update && apt-get install -y \
    nmap \
    wget \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip \
    && unzip nuclei_linux_amd64.zip -d /usr/local/bin/ \
    && rm nuclei_linux_amd64.zip \
    && nuclei -update-templates -silent || true

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --omit=dev

COPY src ./src
RUN npx tsc

ENV NODE_ENV=production
# Configurazione richiesta a runtime:
# SCOPEGUARD_URL=https://your-platform-url
# AGENT_TOKEN=your-token-here
# POLL_INTERVAL_MS=30000

CMD ["node", "dist/index.js"]
