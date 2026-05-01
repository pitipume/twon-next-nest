# START HERE — Twon Platform

> This file is for Claude to read at the start of any new session on a new machine.
> Claude: read this file first, then follow the instructions at the bottom.

---

## What is Twon?

**Twon** is a dual-commerce platform for a family business combining:
1. **Ebook Shop** — buy, read (not download) digital books via browser
2. **E-Tarot Card Shop** — buy tarot card decks, shuffle and spread cards in-browser

Built for a Thai family business (father's physical tarot shop, ~2M THB over 4 years).
Target: Thailand + international. Must be scalable from day one.

---

## Current implementations

| Stack | Repo | Status |
|---|---|---|
| **Next.js + NestJS** (TypeScript full-stack) | `project-ebook` (this repo) | ✅ In progress |
| **Angular + C# .NET** (enterprise full-stack) | `twon-angular-dotnet` | ✅ Built — reference implementation |

---

## Instructions for Claude

When the user opens a new session and this file is present, **ask the following before doing anything else**:

---

> 👋 Welcome back to the **Twon Platform** project.
>
> This repo is the **Next.js + NestJS** implementation.
> → Read `CLAUDE.md` for tech stack and layer architecture
> → Read `docs/` for business rules, data models, API contracts
>
> The Angular + C# .NET reference implementation lives in the `twon-angular-dotnet` repo.

---

## Shared business rules (apply to ALL stacks)

These never change regardless of tech stack:

1. Ebooks **cannot be downloaded** — read in-browser only via signed URLs
2. PDF access via **short-lived signed URLs** — refreshed per reading session
3. Tarot decks = collection of **individual card images** (78 cards typical) stored in R2
4. **Purchases are permanent** — no expiry on purchased content
5. **OTP expires in 5 minutes**, max 3 attempts before lockout
6. Payment flow: **PENDING → WAITING_APPROVAL → COMPLETED** (manual PromptPay slip)
7. Admin approves payment → library access granted automatically
8. No raw storage URLs ever exposed to client — always signed URLs from backend

## Shared data model (applies to ALL stacks)

```
User
├── id, email, displayName, passwordHash
├── role: GUEST | CUSTOMER | PREMIUM | ADMIN | SUPER_ADMIN
└── isEmailVerified, isActive

Product (SQL)
├── id, mongoRefId, productType: EBOOK | TAROT_DECK
├── title, priceTHB, isPublished
└── → MongoDB doc for full metadata

Ebook (MongoDB)
├── title, author, description, coverImageUrl
├── fileKey (R2), totalPages, previewPages
└── language, categories, tags

TarotDeck (MongoDB)
├── name, description, coverImageUrl, backImageKey
├── cardCount
└── cards[]: { cardNumber, name, imageKey, uprightMeaning, reversedMeaning, keywords }

Order
├── id, userId, status, totalTHB
└── orderItems[], payment

Payment
├── orderId, amountTHB, status
├── slipImageKey, transferredAt, note (from customer)
└── approvedBy, approvedAt, rejectionReason (from admin)

LibraryItem
└── userId, productId, orderId, grantedAt
```

## Shared infrastructure (applies to ALL stacks)

| Service | Provider | Purpose |
|---|---|---|
| PostgreSQL | Neon (cloud) or Docker | Users, orders, payments, library |
| MongoDB | Atlas M0 | Ebook metadata, tarot deck config |
| Redis | Upstash (cloud) or Docker | OTP, sessions, rate limiting |
| File storage | Cloudflare R2 | PDFs, card images, slip images |
| Email | Resend | OTP delivery |
| Frontend hosting | Vercel | |
| Backend hosting | Railway | |
