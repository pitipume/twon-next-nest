# System Architecture Overview

> This doc describes the **Next.js + NestJS** implementation.
> For the Angular + C# .NET version, see `dotnet-angular-plan.md`.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                │
│   Browser Desktop │ Browser Mobile │ Browser Tablet/iPad        │
│                   └─ Capacitor wraps to iOS/Android (future) ─┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  Next.js 14+    │  ← Vercel (or Railway later)
                    │  (App Router)   │
                    └────────┬────────┘
                             │ REST / WebSocket (Socket.io)
                    ┌────────▼────────────────────────┐
                    │     NestJS (Node.js + TS)        │
                    │      Modular Monolith API        │
                    │                                 │
                    │  ┌────────┐  ┌───────────────┐  │
                    │  │  Auth  │  │    Catalog    │  │
                    │  └────────┘  └───────────────┘  │
                    │  ┌────────┐  ┌───────────────┐  │
                    │  │ Store  │  │    Library    │  │
                    │  └────────┘  └───────────────┘  │
                    │  ┌────────┐  ┌───────────────┐  │
                    │  │ Admin  │  │   Payment     │  │
                    │  └────────┘  └───────────────┘  │
                    │  ┌────────────────────────────┐  │
                    │  │       Notification         │  │
                    │  └────────────────────────────┘  │
                    └──────────┬──────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐
│  PostgreSQL     │  │    MongoDB      │  │     Redis      │
│  Railway / Neon │  │    Atlas M0     │  │    Upstash     │
│                 │  │                 │  │                │
│ users           │  │ ebooks          │  │ OTP (TTL 5min) │
│ refresh_tokens  │  │ tarot_decks     │  │ rate limits    │
│ products        │  │ reading_progress│  │                │
│ orders          │  │                 │  │                │
│ order_items     │  │                 │  │                │
│ payments        │  │                 │  │                │
│ payment_config  │  │                 │  │                │
│ library_items   │  │                 │  │                │
└─────────────────┘  └─────────────────┘  └────────────────┘
                               │
              ┌────────────────▼──────────────────┐
              │         Cloudflare R2              │
              │                                   │
              │  ebooks/{id}/ebook.pdf             │
              │  ebooks/{id}/cover.webp            │
              │  tarot/{id}/cards/00.webp          │
              │  tarot/{id}/cover.webp             │
              │  tarot/{id}/back.webp              │
              │  slips/{orderId}/slip.jpg          │
              │  payment-config/qr.webp            │
              │                                   │
              │  Access: signed URLs only          │
              │  (S3-compatible API)               │
              └───────────────────────────────────┘
```

---

## Key Request Flows

### 1. Reading an Ebook
```
User → "Read" button
→ GET /api/library/ebooks/:productId/session
→ Backend: validates ownership (LibraryItem in PostgreSQL)
→ Backend: fetches ebook metadata from MongoDB
→ Backend: generates Cloudflare R2 signed URL (2hr expiry)
→ Returns: { signedUrl, currentPage, totalPages }
→ Frontend: react-pdf (PDF.js) streams PDF from R2 signed URL
→ Auto-save progress → POST /api/library/ebooks/:productId/progress
→ Raw R2 file key never exposed to client
```

### 2. Tarot Card Shuffle Session
```
User → opens owned deck
→ GET /api/library/tarot-decks/:productId/session
→ Backend: validates ownership (LibraryItem in PostgreSQL)
→ Backend: fetches deck + all card imageKeys from MongoDB
→ Backend: generates signed URL for each card image (1hr expiry)
→ Returns: { cards: [{ cardNumber, name, imageUrl (signed), uprightMeaning, reversedMeaning }] }
→ Frontend: preloads all images
→ GSAP animates shuffle (pure client-side after load)
→ User draws/spreads → layout rendered in browser
→ No further server calls during shuffle
```

### 3. Purchase + Payment Flow (manual PromptPay)
```
User selects products → POST /api/store/orders { productIds: [...] }
→ Backend: validates products are published + not already owned
→ Backend: creates Order (PENDING) + Payment record (PENDING) in PostgreSQL
→ Returns: { orderId, totalTHB, items[], payment: { bankName, accountNumber, qrImageUrl } }

User makes bank transfer manually (PromptPay / bank app)
→ User uploads slip: POST /api/payment/slip (multipart: file + orderId + transferredAt)
→ Backend: validates order belongs to user and is PENDING
→ Backend: uploads slip image to Cloudflare R2 (slips/{orderId}/slip.jpg)
→ Order → WAITING_APPROVAL, Payment → WAITING_APPROVAL

Admin reviews: GET /api/payment/orders/pending
→ Returns all WAITING_APPROVAL orders with signed slip URL (1hr)

Admin approves: POST /api/payment/orders/:orderId/approve
→ Order → COMPLETED, Payment → APPROVED
→ Backend: creates LibraryItem for every product in the order (skipDuplicates)
→ User's library is now updated — no webhook, no payment gateway
```

### 4. OTP Registration
```
POST /api/auth/register/initiate  { email, displayName }
→ Check email not already used (PostgreSQL)
→ Generate 6-digit OTP (crypto.randomInt)
→ Store in Redis: key=otp:{email}, value=SHA-256(otp), TTL=5min
→ Send via Resend email  (dev: prints to terminal if RESEND_API_KEY is blank)
→ Return success

POST /api/auth/register/verify  { email, otp, password }
→ Fetch OTP hash from Redis
→ Validate OTP — max 3 attempts, 15-min lockout after failure
→ Hash password (bcrypt)
→ Create User in PostgreSQL
→ Delete OTP from Redis
→ Return: JWT access token (15min) + set HttpOnly refresh token cookie (7 days)
```

---

## Module Dependency Map

```
Auth          ── no dependencies (PrismaService + RedisService are @Global)
Catalog       ── no dependencies (uses Mongoose directly via MongooseModule.forFeature)
Notification  ── no dependencies (standalone Resend service)
Store         ── CatalogModule (product validation via CatalogRepository)
Library       ── CatalogModule (ebook/deck lookups via CatalogRepository)
Payment       ── no module imports (PrismaService + StorageService are @Global)
Admin         ── CatalogModule (create/update ebook + tarot deck docs in MongoDB)
```

---

## Scalability Roadmap

### Phase 1 — Modular Monolith (now → ~10k users)
- Single Railway instance for backend, Vercel for frontend
- All modules in one process
- Scale: increase Railway plan CPU/RAM

### Phase 2 — Extract High-Load Modules (10k → 100k users)
- Extract `Library` (read-heavy signed URL generation) → separate service
- Move to AWS: ECS Fargate + RDS + ElastiCache
- Add queue (BullMQ already wired) for async processing

### Phase 3 — Full Microservices (100k+ users)
- Each module → independent service
- AWS EKS (Kubernetes)
- AWS EventBridge for event-driven communication

---

## Security Layers

| Layer | Mechanism |
|---|---|
| Transport | HTTPS (Vercel + Railway enforce TLS) |
| Auth | JWT (15min) + HttpOnly refresh cookie (7 days, rotated) |
| File access | Cloudflare R2 signed URLs — raw keys never sent to client |
| Payment | No gateway webhooks — manual admin approval with slip verification |
| Rate limiting | Redis per-email (OTP attempts), extendable per-IP |
| CORS | `FRONTEND_URL` env var — only known origin allowed |
| SQL injection | Prisma ORM — parameterized queries only |
| XSS | Next.js escapes by default; CSP headers (future) |
