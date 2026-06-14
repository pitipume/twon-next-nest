# CLAUDE.md — Project Twon

> This file is the source of truth for AI-assisted development in this project.
> Read this before making any code changes. Update it when decisions change.

---

## Project Overview

**Twon Platform** is a dual-commerce platform combining:
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
| Users, Auth, Orders, Payments | PostgreSQL | Render (local → production) |
| Ebook metadata, Tarot deck config | MongoDB | Atlas M0 (free forever) |
| Sessions, OTP, Cache, Rate-limit | Redis | Upstash (free tier) |

### File Storage
- **Cloudflare R2** — PDFs and card images (S3-compatible API, 10x cheaper than AWS S3)
- **Cloudflare CDN** — delivery with signed URLs (expire per session)
- **No direct R2 URLs exposed to client** — all access via signed URLs from backend

### Payment
- **Manual PromptPay / bank transfer** — customer uploads slip image, admin approves manually
- **Stripe** — international cards (future, when revenue justifies)
- **Omise** — Thailand PromptPay QR programmatic (future upgrade from manual)
- Backend has `IPaymentProvider` interface for future provider abstraction

### Infrastructure (Start Cheap → Scale to AWS)
| Phase | Service | Provider | Cost |
|---|---|---|---|
| Now | Frontend hosting | Vercel | Free |
| Now | Backend hosting | Render | Free / $7/month |
| Now | PostgreSQL | Render | Free |
| Now | MongoDB | Atlas M0 | Free |
| Now | Redis | Upstash | Free |
| Now | File storage | Cloudflare R2 | Free 10GB |
| Now | Email | Resend | Free 100/day |
| Later | All infra | AWS (ECS + RDS + S3 + SES) | When revenue justifies |
- **CI/CD:** GitHub Actions
- **Containers:** Docker (all services — local dev via docker-compose)
- **Monitoring:** Sentry (errors, free tier) + Render metrics

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
| `CUSTOMER` | Browse catalog, buy and read/use purchased content |
| `PREMIUM` | Same as Customer + can download ebooks (future feature) |
| `MERCHANT` | Upgraded Customer — can upload/publish/delete **their own content only**; cannot approve payments or manage other merchants' content. Scoping enforcement is V2. |
| `ADMIN` | Full platform access — upload, publish/unpublish, delete any content, approve payments, manage all users. Cross-account. Only Poom + dad. |

**Guest (unauthenticated):** Browse catalog only, no purchase.

**Admin vs Merchant distinction:**
- Payment approval is admin-only — merchants never approve payments (platform verifies bank slips)
- Admin sees all products across all accounts; Merchant sees only their own (V2 enforcement)
- Both `ADMIN` and `MERCHANT` currently share the same admin endpoints — merchant scoping (userId checks) is deferred to V2 when the first third-party merchant joins

---

## Key Business Rules

1. **Ebooks cannot be downloaded** unless user has `Premium` role (future)
2. **PDF access** is served via short-lived signed URLs — refreshed per reading session. Raw R2 keys are never exposed to the client.
3. **Tarot decks** = collection of individual card images (78 cards typical) stored in Cloudflare R2
4. **Tarot cards** uploaded as a ZIP by admin → client uploads ZIP directly to R2 (presigned PUT URL) → backend downloads ZIP, extracts images, converts to WebP, uploads each card to R2, deletes original ZIP
5. **Reading progress** is saved per user per ebook (page/position) — not yet implemented
6. **Purchases are permanent** — no expiry on purchased content
7. **OTP expires in 5 minutes**, max 3 attempts before lockout
8. **Feature flags** control what is visible — `FEATURE_ETAROT_ENABLED=false` hides all tarot from catalog/upload; `FEATURE_EMAIL_OTP_ENABLED=false` skips email and auto-verifies registration with fixed OTP `000000`
9. **Catalog detail response is flat** — `getEbookDetail` / `getTarotDeckDetail` return a flat Product-shaped object (not nested `{product, ebook}`), with cover URL already signed

---

## Tarot Card Data Model (Key Design Decision)

A tarot **Deck** is not a single file — it is a collection of card images.

```
Deck (MongoDB)
├── id, name, description, coverImageUrl (R2 key), backImageKey (R2 key)
├── createdBy (adminId), isPublished, postgresProductId
└── cards: [
      { cardNumber, name, imageKey (R2 key), uprightMeaning, reversedMeaning, keywords, suit }
    ]
```

**Card imageKeys are NEVER sent to client** — library session endpoint signs each key and returns short-lived URLs.

Admin upload flow (presigned R2 — client uploads files directly, backend processes):
1. Admin calls `POST /admin/tarot-decks/upload-urls` → receives presigned PUT URLs for ZIP + cover + back card
2. Client uploads ZIP directly to R2 (bypasses backend, no 413 errors)
3. Admin calls `POST /admin/tarot-decks` with the R2 keys (JSON body)
4. Backend downloads ZIP from R2, deletes it, extracts images, converts to WebP (Sharp), uploads each card image to R2 at `tarot/{mongoId}/cards/{index}.webp`
5. MongoDB deck document and Prisma product record are created and linked

## Ebook Upload Flow (Presigned R2)

1. Admin calls `POST /admin/ebooks/upload-urls` → receives presigned PUT URLs for PDF + cover
2. Client uploads PDF directly to R2 (with XHR for progress tracking), optionally uploads cover
3. Admin calls `POST /admin/ebooks` with R2 keys + metadata (JSON body)
4. Backend creates MongoDB ebook doc and Prisma product record, links them
5. PDF page count is parsed client-side via pdfjs-dist during upload step

## Payment Flow (Manual PromptPay)

Current implementation (no payment gateway license required):
1. Customer places order → `POST /store/orders` → `Order` created (PENDING)
2. Customer sees PromptPay QR + bank details → uploads payment slip image
3. Admin receives notification → reviews slip → `PATCH /payment/:id/approve` or reject
4. On approval → `LibraryItem` records created → customer can read/access content
5. All payments go through Twon's bank account (not a payment gateway — platform collects for products it sells)

**Merchant revenue sharing (V2):** Platform takes 10–20% commission. At month-end, admin reviews merchant sales and manually transfers net amount via bank transfer. No payment gateway license needed — this is a standard marketplace/consignment model.

---

## Feature Flags

Controlled via environment variables. Default = `false` (off). Set to `'true'` (string) to enable.

| Flag | Backend env var | Frontend env var | Effect when `false` |
|---|---|---|---|
| eTarot | `FEATURE_ETAROT_ENABLED` | `NEXT_PUBLIC_FEATURE_ETAROT_ENABLED` | Catalog forced to EBOOK only; tarot filter tab + admin upload tab hidden |
| Email OTP | `FEATURE_EMAIL_OTP_ENABLED` | `NEXT_PUBLIC_FEATURE_EMAIL_OTP_ENABLED` | No email sent on register; fixed OTP `000000` stored; frontend auto-verifies (no verify page shown) |

Flag logic lives in:
- `apps/api/src/config/features.ts`
- `apps/web/src/config/features.ts`

When `FEATURE_EMAIL_OTP_ENABLED=true`: OTP is generated, logged to server console (`AuthManager` Logger), and emailed via Resend.

---

## Implemented Features (as of current state)

### Auth
- Register (2-step: initiate → OTP verify) with OTP feature flag bypass
- Login with JWT access token (15min) + refresh token (7 days, HttpOnly cookie)
- Silent token refresh via axios interceptor (queues concurrent requests)
- Logout (revokes refresh token)
- Forgot password / reset password (OTP flow)
- Profile editing — display name change + password change (current password required)

### Catalog
- Browse published products (ebook + tarot, filterable)
- Search by title
- Product detail page (flat response — cover signed, price as number)
- Owned products shown in browse with "In Library" badge + direct reader link
- Free preview — `GET /catalog/:id/preview` returns signed PDF URL + previewPages count (no auth); shown on detail page if `previewPages > 0`; preview reader caps pages with buy CTA at end

### Admin
- Upload ebooks and tarot decks via presigned R2 PUT URLs (client uploads directly)
- PDF thumbnail auto-generated client-side (pdfjs-dist)
- Publish / unpublish products
- Delete draft products
- View all products list (includes unpublished) — shows uploader displayName
- `uploadedBy` (userId) saved on every Product — foundation for V2 merchant scoping
- Pending payments — approve individually or select-all + batch approve
- Batch approve: `POST /payment/orders/approve-batch` with `{ orderIds: string[] }`
- Payment config (bank name, account number, QR image) — ADMIN only

### Ebook Reader
- Scroll mode (virtual scrolling via `@tanstack/react-virtual` — safe for 1000+ pages)
- Page mode (swipe/arrow key navigation, `key={page}` forces canvas remount)
- Mobile-responsive (`100svh`, `min-h-0` flex fix for iOS Safari)
- Loading states (`DocLoader`, `PageSkeleton`, `loading.tsx`)
- Back button in toolbar, mode persisted to localStorage
- PDF served via signed R2 URL (no download, no direct key exposure)

### Library
- User's purchased items displayed on home page (horizontal scroll)
- Ebook reading session endpoint (returns signed PDF URL + page count)
- Tarot session endpoint (returns signed card image URLs)
- Library covers signed correctly (was returning raw R2 keys — fixed)

---

## Development Principles

- **Mobile-first** responsive design (then tablet, desktop)
- **Accessibility:** WCAG 2.1 AA minimum (all generations use this)
- **Security:** No secrets in code, all via environment variables (Render + Vercel dashboard for production)
- **No download exploits:** PDF.js disables print/save, signed URLs expire, watermark on PDF stream (future)
- **Performance:** Core Web Vitals target Green across all pages
- **Testing strategy:**
  - Always run `npm run build` in both `apps/api` and `apps/web` before pushing — catches TypeScript errors locally before burning a deploy cycle
  - Unit tests for pure business logic: OTP expiry, password rules, permission checks, price calculations
  - Integration tests for critical flows: register → verify → login, payment approval → library access granted
  - Skip unit tests for thin handlers/controllers that only pass data through (no logic to test)
  - Do NOT chase 99-100% coverage — mocks hide real SDK behavior (e.g. Resend SDK returns `{error}` instead of throwing; a mock that throws gives false confidence)
  - When a bug escapes to production, add a test that would have caught it

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
│   └── /api                     ← NestJS backend (Render)
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
| `dev` | Deployed branch preview, real OTP, Stripe test mode | Vercel preview + Render dev |
| `staging` | Production mirror, full integration test | Vercel + Render |
| `production` | Live, real payments | Vercel + Render → AWS (future) |

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
- **Keep docs in sync with code** — whenever you add/change/remove an endpoint, entity field, enum value, or config key, update the relevant doc in `docs/` in the same response. Docs are the source of truth for future AI sessions.
- **Keep CLAUDE.md in sync with decisions** — update CLAUDE.md whenever a decision is made, at any stage:
  - **During exploration/draft** → add the entry marked `[DRAFT]` so future sessions know it's in progress
  - **Once finalized** → remove the `[DRAFT]` marker and write the clean settled version
  - Never leave CLAUDE.md silent about something actively being decided — a draft note is better than nothing

---

## Glossary

- **Deck** — a full set of tarot cards (typically 78), sold as a product
- **Card** — individual image within a deck
- **Spread** — layout of drawn cards during a reading session
- **Shuffle** — the animated card-randomization interaction
- **Library** — user's collection of purchased ebooks and tarot decks
- **Signed URL** — time-limited Cloudflare R2 URL generated per session to serve protected content (PDFs, card images, covers). Raw R2 keys are never sent to the client.
