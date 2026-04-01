# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                │
│   Browser Desktop │ Browser Mobile │ Browser Tablet/iPad        │
│                   └─ Capacitor wraps to iOS/Android (future) ─┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  CloudFront CDN │  ← Static assets, signed PDFs & card images
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Next.js 14+    │  ← ECS Fargate or Vercel
                    │  (Frontend SSR) │
                    └────────┬────────┘
                             │ REST / WebSocket (SignalR)
                    ┌────────▼────────────────────────┐
                    │     ASP.NET Core (.NET 9)        │
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
│  AWS RDS        │  │    Atlas        │  │  ElastiCache   │
│                 │  │                 │  │                │
│ users           │  │ ebook_metadata  │  │ OTP (TTL 5min) │
│ orders          │  │ tarot_decks     │  │ sessions       │
│ order_items     │  │ tarot_cards     │  │ rate limits    │
│ payments        │  │ reading_progress│  │ catalog cache  │
│ user_roles      │  │ shuffle_history │  │                │
│ refresh_tokens  │  │                 │  │                │
└─────────────────┘  └─────────────────┘  └────────────────┘
          │
┌─────────▼──────────────────────────────────────────────┐
│                      AWS Services                      │
│                                                        │
│  S3          — private bucket: PDFs + card images      │
│  CloudFront  — CDN + signed URL delivery               │
│  SES         — OTP emails + order confirmations        │
│  Secrets Mgr — DB creds, API keys (no hardcoding)      │
│  CloudWatch  — logs, metrics, alarms                   │
│  ECS Fargate — container hosting                       │
└────────────────────────────────────────────────────────┘
```

---

## Key Request Flows

### 1. Reading an Ebook
```
User → "Read" button
→ GET /api/library/{ebookId}/session
→ Backend: validates ownership (PostgreSQL)
→ Backend: generates CloudFront signed URL (2hr expiry)
→ Returns: { signedUrl, currentPage, totalPages }
→ Frontend: PDF.js streams PDF from CloudFront
→ Auto-save progress every 30s → POST /api/library/{ebookId}/progress
→ No raw S3 URL ever exposed to client
```

### 2. Tarot Card Shuffle Session
```
User → opens owned deck
→ GET /api/library/{deckId}/session
→ Backend: validates ownership
→ Backend: generates signed URLs for all 78 card images (1hr expiry)
→ Returns: { cards: [{ id, name, imageUrl (signed), meaning }] }
→ Frontend: preloads all images
→ GSAP animates shuffle (pure client-side after load)
→ User draws/spreads → layout rendered in browser
→ No further server calls needed during shuffle
```

### 3. Purchase + Payment Flow
```
User selects product
→ POST /api/store/cart/checkout
→ Backend: creates Order (status: PENDING) in PostgreSQL
→ Backend: calls Stripe or Omise depending on payment method selected
→ Returns: { stripeClientSecret } or { qrCodeBase64, orderId }
→ User completes payment in UI
→ Payment gateway → POST /api/payments/webhook (signed callback)
→ Backend: validates webhook signature
→ Backend: Order status → COMPLETED
→ Backend: creates LibraryItem record for user
→ Frontend: receives WebSocket notification → redirect to library
```

### 4. OTP Registration
```
POST /api/auth/register/initiate  { email, displayName }
→ Check email not already used (PostgreSQL)
→ Generate 6-digit OTP
→ Store in Redis: key=otp:{email}, value=hash(otp), TTL=5min
→ Send via AWS SES
→ Return: { message: "OTP sent" }

POST /api/auth/register/verify  { email, otp, password }
→ Fetch OTP hash from Redis
→ Validate OTP (max 3 attempts before lockout)
→ Hash password (bcrypt, cost=12)
→ Create User in PostgreSQL
→ Delete OTP from Redis
→ Return: JWT access token (15min) + set HttpOnly refresh token cookie (7 days)
```

---

## Module Dependency Map

```
Auth          ── no dependencies
Catalog       ── no dependencies
Notification  ── Auth (email)
Store         ── Catalog, Auth
Payment       ── Store, Auth
Library       ── Catalog, Auth, Payment (listens for payment events)
Admin         ── all modules (management operations)
```

---

## Scalability Roadmap

### Phase 1 — Modular Monolith (0 → ~10k users)
- Single ECS Fargate task (or Vercel for frontend)
- All modules in one process
- Easy to develop and debug
- Scale: increase task CPU/RAM, add RDS read replicas

### Phase 2 — Extract High-Load Modules (10k → 100k users)
- Extract `Library` (read-heavy) → separate service
- Extract `Payment` (PCI compliance isolation) → separate service
- Add AWS API Gateway in front
- Add SQS for async order processing

### Phase 3 — Full Microservices (100k+ users)
- Each module → independent service
- EKS (Kubernetes)
- AWS EventBridge for event-driven communication
- AWS App Mesh service mesh

---

## Security Layers

| Layer | Mechanism |
|---|---|
| Transport | HTTPS enforced via CloudFront |
| Auth | JWT + HttpOnly cookie refresh token |
| File access | CloudFront signed URLs (no public S3) |
| Payment | Webhook signature verification |
| Secrets | AWS Secrets Manager (never in env files on prod) |
| Rate limiting | Redis per-IP and per-user |
| CORS | Allowlist only known frontend origins |
| SQL injection | EF Core parameterized queries only |
| XSS | Next.js escapes by default; CSP headers |
