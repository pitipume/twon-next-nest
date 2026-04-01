# CLAUDE.md — Project Aura (working title)

> This file is the source of truth for AI-assisted development in this project.
> Read this before making any code changes. Update it when decisions change.

---

## Project Overview

**Aura Platform** is a dual-commerce platform combining:
1. **Ebook Shop** — buy, read (not download) digital books via browser
2. **E-Tarot Card Shop** — buy tarot card decks, shuffle and spread cards in-browser

Built for a family business (father's physical tarot business with 2M THB in 4-year sales).
Target market: Thailand + international. Platform must be scalable from day one.

---

## Tech Stack (Final Decisions)

### Frontend
- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS v4 + Shadcn/ui (Radix UI primitive components)
- **Animation:** GSAP (tarot shuffle/spread) + Framer Motion (UI transitions)
- **PDF Viewer:** react-pdf (PDF.js wrapper) — streamed, no download
- **State:** Zustand (lightweight global state) + TanStack Query (server state/caching)
- **Forms:** React Hook Form + Zod validation
- **Future App:** Capacitor.js wraps Next.js → iOS/Android without rewrite

### Backend
- **Framework:** NestJS (Node.js + TypeScript) — Modular Monolith
- **Pattern:** CQRS via `@nestjs/cqrs` — same Controller → Handler → Manager → Service → Repository layering as prior .NET work
- **Auth:** JWT (access token 15min) + Refresh token (7 days) stored in HttpOnly cookie
- **OTP:** 6-digit code, stored in Redis with 5-minute TTL
- **Email:** Resend (OTP delivery, order confirmations)
- **Real-time:** Socket.io via `@nestjs/websockets` (reading progress sync, payment completion notify)
- **Background Jobs:** BullMQ + Redis (queue-based jobs: email retry, ZIP processing)
- **Validation:** class-validator + class-transformer + NestJS ValidationPipe
- **ORM:** Prisma (PostgreSQL) + Mongoose (MongoDB)

### Layer Architecture (mirrors prior .NET structure exactly)
```
Controller   → CommandBus.execute() / QueryBus.execute() — no logic
Handler      → @CommandHandler / @QueryHandler — normalize → validate → call manager → shape response
Manager      → @Injectable() — business logic only, orchestrates services, never returns DTOs
Service      → @Injectable() — data access only, calls repository, no business rules
Repository   → Prisma / Mongoose — no logic
```

### Databases
| Purpose | Database | Hosted |
|---|---|---|
| Users, Auth, Orders, Payments | PostgreSQL | Railway (local → production) |
| Ebook metadata, Tarot deck config | MongoDB | Atlas M0 (free forever) |
| Sessions, OTP, Cache, Rate-limit | Redis | Upstash (free tier) |

### File Storage
- **Cloudflare R2** — PDFs and card images (S3-compatible API, 10x cheaper than AWS S3)
- **Cloudflare CDN** — delivery with signed URLs (expire per session)
- **No direct R2 URLs exposed to client** — all access via signed URLs from backend

### Payment
- **Stripe** — international cards, subscriptions possible later
- **Omise** — Thailand PromptPay QR (local bank transfers, very common here)
- Both unified behind a `IPaymentProvider` interface in the backend

### Infrastructure (Start Cheap → Scale to AWS)
| Phase | Service | Provider | Cost |
|---|---|---|---|
| Now | Frontend hosting | Vercel | Free |
| Now | Backend hosting | Railway | Free / $5/month |
| Now | PostgreSQL | Railway | Free |
| Now | MongoDB | Atlas M0 | Free |
| Now | Redis | Upstash | Free |
| Now | File storage | Cloudflare R2 | Free 10GB |
| Now | Email | Resend | Free 100/day |
| Later | All infra | AWS (ECS + RDS + S3 + SES) | When revenue justifies |
- **CI/CD:** GitHub Actions
- **Containers:** Docker (all services — local dev via docker-compose)
- **Monitoring:** Sentry (errors, free tier) + Railway metrics

---

## Architecture Pattern

```
Modular Monolith (now) → Microservices (when scale demands)
```

Modules in `apps/api/src/modules/` (each is independently deployable later):
- `auth` — register, OTP, login, token refresh
- `catalog` — ebook and tarot product listings, search
- `library` — purchased items, reading progress, access control
- `store` — cart, checkout, order management
- `payment` — Stripe + Omise abstraction, webhook handling
- `admin` — upload content, manage users, analytics
- `notification` — email via Resend, future: push

Each module folder structure:
```
modules/auth/
  commands/          ← write operations (register, login, refresh)
  queries/           ← read operations (get profile)
  managers/          ← business logic
  services/          ← data access
  repositories/      ← Prisma/Mongoose calls
  dto/               ← request/response shapes + class-validator decorators
  guards/            ← NestJS Guards (= .NET IAuthorizationFilter)
  auth.module.ts     ← NestJS @Module() registration
```

---

## User Roles & Access

| Role | Description |
|---|---|
| `Guest` | Browse catalog only |
| `Customer` | Buy and read/use purchased content |
| `Premium` | Can download ebooks (future feature) |
| `Admin` | Upload content, manage users, view analytics |
| `SuperAdmin` | Full system access |

---

## Key Business Rules

1. **Ebooks cannot be downloaded** unless user has `Premium` role (future)
2. **PDF access** is served via short-lived signed URLs — refreshed per reading session
3. **Tarot decks** = collection of individual card images (78 cards typical) stored in S3
4. **Tarot cards** uploaded as a ZIP by admin → backend processes → stores each card image in S3
5. **Reading progress** is saved per user per ebook (page/position)
6. **Purchases are permanent** — no expiry on purchased content
7. **OTP expires in 5 minutes**, max 3 attempts before lockout

---

## Tarot Card Data Model (Key Design Decision)

A tarot **Deck** is not a single file — it is a collection of card images.

```
Deck (MongoDB)
├── id, name, description, price, previewImageUrl
├── createdBy (adminId), isPublished
└── cards: [
      { cardNumber, name, imageUrl, meaning, keywords, isReversible }
    ]
```

Admin upload flow:
1. Admin uploads a ZIP file with naming convention: `01_the_fool.webp`, `02_the_magician.webp`...
2. Backend extracts, converts to WebP if needed, uploads each to S3
3. Deck document created in MongoDB with all card URLs

---

## Development Principles

- **Mobile-first** responsive design (then tablet, desktop)
- **Accessibility:** WCAG 2.1 AA minimum (all generations use this)
- **Security:** No secrets in code, all via env vars / AWS Secrets Manager
- **No download exploits:** PDF.js disables print/save, signed URLs expire, watermark on PDF stream (future)
- **Performance:** Core Web Vitals target Green across all pages
- **Testing:** Unit tests per module, Integration tests for critical flows (auth, payment, access control)

---

## Folder Structure (Monorepo)

```
/project-ebook
├── CLAUDE.md                    ← you are here
├── /docs                        ← all documentation
│   ├── /architecture
│   ├── /business
│   └── /technical
├── /apps
│   ├── /web                     ← Next.js 14+ frontend (Vercel)
│   └── /api                     ← NestJS backend (Railway)
├── /packages
│   └── /shared-types            ← shared TypeScript types (DTOs, enums used by both apps)
├── /scripts                     ← dev scripts, DB seed data
├── docker-compose.yml           ← local dev: PostgreSQL + MongoDB + Redis
├── turbo.json                   ← Turborepo build orchestration
└── .github/workflows            ← CI/CD pipelines
```

---

## Environment Strategy

| Environment | Purpose | Hosting |
|---|---|---|
| `local` | Docker Compose (Postgres + Mongo + Redis), mock payment, Resend sandbox | Localhost |
| `dev` | Deployed branch preview, real OTP, Stripe test mode | Vercel preview + Railway dev |
| `staging` | Production mirror, full integration test | Vercel + Railway |
| `production` | Live, real payments | Vercel + Railway → AWS (future) |

---

## Future Expansion Notes (Trading Bot Platform)

When building the trading bot platform next, reuse:
- The auth module pattern (JWT + OTP — copy-paste ready)
- The `IPaymentProvider` interface pattern → becomes `IExchangeProvider` for Binance/etc.
- The notification module (email alerts for trades)
- GitHub Actions CI/CD pipeline template (identical workflow structure)
- `docker-compose.yml` pattern (same Redis, same Postgres schema approach)
- Monitoring stack (Sentry free tier — same DSN setup)
- `ccxt` (crypto exchange library) is Node.js-native — works perfectly in NestJS

NestJS knowledge transfers 100% to the trading bot project.

---

## AI Assistant Guidelines (Claude-specific)

- **Always use `Edit` tool** for modifying existing files — it shows a diff preview in VSCode
- `Write` tool is only acceptable for **brand new files** that do not yet exist
- After any file is first created with `Write`, all future changes must use `Edit`

---

## Glossary

- **Deck** — a full set of tarot cards (typically 78), sold as a product
- **Card** — individual image within a deck
- **Spread** — layout of drawn cards during a reading session
- **Shuffle** — the animated card-randomization interaction
- **Library** — user's collection of purchased ebooks and tarot decks
- **Signed URL** — time-limited AWS S3 URL generated per session to serve protected content
