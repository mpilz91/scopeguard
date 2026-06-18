# ScopeGuard — Setup Sprint 1

## Prerequisiti
- Node.js 20+
- Docker + Docker Compose
- npm 10+

## 1. Avvia infrastruttura (PostgreSQL + Redis)

```bash
cd /home/marco/Desktop/tools/scopeguard
npm run infra:up
```

## 2. Configura variabili d'ambiente

```bash
cd apps/web
cp .env.example .env
# Modifica NEXTAUTH_SECRET con: openssl rand -base64 32
```

## 3. Installa dipendenze

```bash
cd /home/marco/Desktop/tools/scopeguard
npm install
```

## 4. Applica schema Prisma

```bash
cd apps/web
npx prisma migrate dev --name init
# oppure: npx prisma db push (più veloce in dev)
```

## 5. Seed database

```bash
npx prisma db seed
# Account demo: admin@example.com / Admin1234!
```

## 6. Avvia dev server

```bash
cd /home/marco/Desktop/tools/scopeguard
npm run dev
# → http://localhost:3000
```

## Struttura Sprint 1

```
✅ Multi-tenancy: Organization / User / Membership
✅ Auth: Register + Login (NextAuth JWT)
✅ Customer CRUD
✅ Asset CRUD con tenant isolation
✅ Assessment CRUD con validazione transizioni stato
✅ Audit log per tutte le operazioni
✅ BullMQ Worker (nmap + nuclei + scope validation)
✅ Agent interno Docker (polling HTTPS)
✅ API agent con token hashed
✅ Dashboard con KPI
✅ Pagine: Dashboard, Customers, Assets, Assessments, Findings, Reports, Agents, Settings

## Sprint 2 (prossimo)
- Assessment detail con scope editor
- Rules of Engagement editor + invio email cliente
- Token approvazione ROE per il cliente
- Lancio scan job dalla UI
- Report PDF con puppeteer/playwright
- Agent token management UI
- Audit log viewer
```
