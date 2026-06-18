FROM node:20-slim

# Installa nmap e nuclei
RUN apt-get update && apt-get install -y \
    nmap \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Installa nuclei
RUN wget -q https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip \
    && apt-get install -y unzip \
    && unzip nuclei_linux_amd64.zip -d /usr/local/bin/ \
    && rm nuclei_linux_amd64.zip

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --omit=dev

COPY src ./src

# Copia schema Prisma dal web app (shared)
COPY ../web/prisma ./prisma

RUN npx prisma generate
RUN npx tsc

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
