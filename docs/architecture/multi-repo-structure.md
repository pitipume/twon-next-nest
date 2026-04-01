# Twon — Multi-Repo & Folder Structure

> This doc answers: "when I create the Angular + .NET version, what folders and repos do I make?"

---

## The 3 repos

```
GitHub (personal account)
├── twon-docs/               ← shared business rules, API contracts (no code)
├── twon-next-nest/          ← this current repo (Next.js + NestJS)
└── twon-angular-dotnet/     ← future repo (Angular + C# .NET)
```

Each is a **separate GitHub repo**. They share business knowledge via `twon-docs`.

---

## Repo 1 — `twon-docs` (create this first)

```
twon-docs/
├── CLAUDE.md                ← "this repo is the shared business brain"
├── README.md
├── business/
│   ├── overview.md          ← what Twon is, target market, goals
│   ├── user-roles.md        ← GUEST / CUSTOMER / PREMIUM / ADMIN / SUPER_ADMIN
│   └── business-rules.md   ← no download, signed URLs, OTP rules, payment flow
├── data-models/
│   ├── user.md              ← User, RefreshToken schema (language-agnostic)
│   ├── product.md           ← Product, Ebook, TarotDeck schema
│   ├── order.md             ← Order, OrderItem, Payment schema
│   └── library.md           ← LibraryItem schema
├── api-contracts/
│   ├── auth.md              ← all auth endpoints, request/response shapes
│   ├── catalog.md           ← catalog endpoints
│   ├── library.md           ← library endpoints
│   ├── store.md             ← store/checkout endpoints
│   ├── payment.md           ← payment slip/approve/reject endpoints
│   └── admin.md             ← admin upload/config endpoints
└── infrastructure/
    ├── storage.md           ← R2 bucket structure, signed URL rules
    └── services.md          ← Neon, Atlas, Upstash, Resend, Cloudflare R2
```

> **Claude reads this repo** to understand the business before touching any code repo.
> Copy `docs/START-HERE.md` from `twon-next-nest` here as the root `CLAUDE.md`.

---

## Repo 2 — `twon-next-nest` (this current repo)

```
twon-next-nest/              ← rename from project-ebook when you move to personal laptop
├── CLAUDE.md                ← "read twon-docs first, then this"
├── docs/
│   ├── START-HERE.md
│   ├── technical/
│   │   ├── commands.md
│   │   ├── cloud-databases-setup.md
│   │   ├── personal-laptop-setup.md
│   │   └── deployment.md
│   └── architecture/
│       ├── dotnet-angular-plan.md
│       └── multi-repo-structure.md   ← this file
├── apps/
│   ├── web/                 ← Next.js 16 frontend
│   └── api/                 ← NestJS backend
├── packages/
│   └── shared-types/        ← TypeScript types shared between web + api
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## Repo 3 — `twon-angular-dotnet` (create when ready)

```
twon-angular-dotnet/
├── CLAUDE.md                ← "read twon-docs first, then this"
├── docs/
│   └── setup.md             ← how to run this repo locally
├── frontend/                ← Angular app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   └── auth.interceptor.ts    ← attaches JWT, handles 401 refresh
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.service.ts         ← base HTTP wrapper
│   │   │   │   │   └── storage.service.ts
│   │   │   │   └── models/                    ← TypeScript interfaces (mirrors twon-docs)
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   │   ├── navbar/
│   │   │   │   │   ├── button/
│   │   │   │   │   ├── badge/
│   │   │   │   │   └── spinner/
│   │   │   │   └── pipes/
│   │   │   └── features/                      ← one folder per page group
│   │   │       ├── auth/
│   │   │       │   ├── login/
│   │   │       │   ├── register/
│   │   │       │   └── verify/
│   │   │       ├── catalog/
│   │   │       │   ├── catalog-list/          ← home page (product grid)
│   │   │       │   └── catalog-detail/        ← product detail + buy
│   │   │       ├── checkout/
│   │   │       │   └── checkout/              ← QR display + slip upload
│   │   │       ├── library/
│   │   │       │   ├── library-list/          ← my purchased items
│   │   │       │   ├── ebook-reader/          ← PDF viewer
│   │   │       │   └── tarot-reader/          ← shuffle + spread
│   │   │       └── admin/
│   │   │           ├── admin-dashboard/
│   │   │           ├── admin-upload/
│   │   │           ├── admin-orders/
│   │   │           └── admin-config/
│   │   ├── environments/
│   │   │   ├── environment.ts               ← dev: API at localhost:5000
│   │   │   └── environment.prod.ts
│   │   └── styles.css
│   ├── angular.json
│   ├── tailwind.config.js
│   └── package.json
│
└── backend/                 ← ASP.NET Core 8 Web API
    ├── Twon.sln
    ├── Twon.API/                            ← entry point, controllers, middleware
    │   ├── Controllers/
    │   │   ├── AuthController.cs
    │   │   ├── CatalogController.cs
    │   │   ├── LibraryController.cs
    │   │   ├── StoreController.cs
    │   │   ├── PaymentController.cs
    │   │   └── AdminController.cs
    │   ├── Middleware/
    │   │   └── ExceptionMiddleware.cs
    │   ├── Program.cs
    │   └── appsettings.json
    ├── Twon.Application/                    ← MediatR commands + queries + handlers
    │   ├── Auth/
    │   │   ├── Commands/
    │   │   │   ├── InitiateRegister/
    │   │   │   │   ├── InitiateRegisterCommand.cs
    │   │   │   │   └── InitiateRegisterHandler.cs
    │   │   │   ├── VerifyRegister/
    │   │   │   ├── Login/
    │   │   │   ├── RefreshToken/
    │   │   │   └── Logout/
    │   │   ├── Managers/
    │   │   │   └── AuthManager.cs
    │   │   └── DTOs/
    │   ├── Catalog/
    │   ├── Library/
    │   ├── Store/
    │   ├── Payment/
    │   └── Admin/
    ├── Twon.Domain/                         ← entities, enums, interfaces
    │   ├── Entities/
    │   │   ├── User.cs
    │   │   ├── Product.cs
    │   │   ├── Order.cs
    │   │   ├── Payment.cs
    │   │   └── LibraryItem.cs
    │   └── Enums/
    │       ├── UserRole.cs
    │       ├── OrderStatus.cs
    │       └── ProductType.cs
    └── Twon.Infrastructure/                 ← EF Core, MongoDB, Redis, R2, Email
        ├── Persistence/
        │   ├── TwonDbContext.cs             ← EF Core (PostgreSQL)
        │   └── Migrations/
        ├── MongoDB/
        │   ├── MongoDbContext.cs
        │   └── Repositories/
        ├── Redis/
        │   └── RedisService.cs
        ├── Storage/
        │   └── R2StorageService.cs
        └── Email/
            └── ResendEmailService.cs
```

---

## How the 3 repos connect

```
twon-docs  ←────────────────────────────────────────┐
  (shared business rules,                           │
   data models, API contracts)                      │
       ↑                                            │
       │ Claude reads this first                    │ Claude reads this first
       │                                            │
twon-next-nest                          twon-angular-dotnet
  CLAUDE.md says:                         CLAUDE.md says:
  "read twon-docs first"                  "read twon-docs first"
```

Both code repos reference `twon-docs` for **what** to build.
Their own `CLAUDE.md` explains **how** to build it in that stack.

---

## When to create each repo

| Repo | When |
|---|---|
| `twon-next-nest` | Now — rename `project-ebook` when you move to personal laptop |
| `twon-docs` | When you start the Angular version — extract shared docs then |
| `twon-angular-dotnet` | When you're ready to build the .NET version |

> No need to create `twon-docs` separately right now.
> The `docs/START-HERE.md` in this repo serves the same purpose until you have two active codebases.

---

## GitHub repo names (suggested)

```
github.com/pitipume/twon-next-nest        ← rename from project-ebook
github.com/pitipume/twon-angular-dotnet   ← create when ready
github.com/pitipume/twon-docs             ← create when you have both active
```
