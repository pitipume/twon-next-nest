# Twon Platform — Next.js + NestJS

Dual-commerce platform: **Ebook Shop** + **E-Tarot Card Shop**

---

## Docs Structure

| Folder | Purpose |
|---|---|
| [`docs/business/`](docs/business/) | Product overview, business rules, user roles |
| [`docs/data-models/`](docs/data-models/) | User, product, order, library schemas |
| [`docs/api-contracts/`](docs/api-contracts/) | Auth, catalog, store, payment, library, admin |
| [`docs/infrastructure/`](docs/infrastructure/) | Cloud services, storage |
| [`docs/technical/`](docs/technical/) | Setup, commands, deployment |

---

## Quick Start

```bash
# 1. Install all dependencies (root)
npm install

# 2. Start local databases
docker compose up -d

# 3. Run migrations + seed
cd apps/api
npx prisma migrate dev
npx prisma db seed       # optional

# 4. Run everything (from root)
npm run dev
# → API:      http://localhost:3001
# → Web:      http://localhost:3000
# → Swagger:  http://localhost:3001/api/docs
```

---

## Stack

| Part | Technology |
|---|---|
| Frontend | Next.js 14+, Tailwind CSS v4, Shadcn/ui, GSAP |
| Backend | NestJS, CQRS (@nestjs/cqrs), Prisma (PostgreSQL), Mongoose (MongoDB) |
| Database | PostgreSQL (Neon) + MongoDB (Atlas) + Redis (Upstash) |
| Storage | Cloudflare R2 |
| Email | Resend |
| Monorepo | Turborepo |
