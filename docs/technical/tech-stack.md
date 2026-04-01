# Tech Stack Reference

## Why Each Choice Was Made

### Frontend — Next.js 14+ (App Router) + TypeScript

- **SSR/SSG** — fast page loads, SEO for catalog pages (ebook listings rank on Google)
- **App Router** — React Server Components reduce JS bundle sent to browser
- **TypeScript** — same language as backend; shared types via `packages/shared-types`
- **Future app** — Capacitor.js wraps the web build into iOS/Android without a rewrite

### Styling — Tailwind CSS + Shadcn/ui

- **Tailwind** — utility-first, no CSS file bloat, consistent spacing/color tokens
- **Shadcn/ui** — copy-paste components (not a locked library), built on Radix UI (accessible by default)
- Components live in `apps/web/components/ui/` — you own the code, can customize freely

### Animation — GSAP + Framer Motion

- **GSAP** — industry standard for complex sequential animations (tarot shuffle, card flip, spread)
- **Framer Motion** — React-native, declarative UI transitions (page transitions, modals, hover)
- Rule: GSAP for tarot interactions, Framer Motion for everything else

### State Management — Zustand + TanStack Query

- **Zustand** — global client state (auth user, cart, active deck session)
- **TanStack Query** — server state (API data fetching, caching, background refresh)
- No Redux — overkill for this scale

### Backend — NestJS (Node.js + TypeScript)

- **Modular** — each feature is an isolated NestJS module (same as .NET `ModuleConfiguration`)
- **@nestjs/cqrs** — Commands (writes) + Queries (reads) with handlers (identical to MediatR)
- **Dependency Injection** — built-in IoC container (identical to .NET DI)
- **Guards** — equivalent to .NET `IAuthorizationFilter` (JWT guard, roles guard)
- **Pipes** — equivalent to .NET FluentValidation pipeline (ValidationPipe with class-validator)
- **Interceptors** — logging, response transform (equivalent to .NET Action Filters)

### ORM — Prisma (PostgreSQL) + Mongoose (MongoDB)

- **Prisma** — type-safe, schema-first, auto-generates TypeScript types from schema. Migrations built-in.
- **Mongoose** — ODM for MongoDB, schema definition with TypeScript support
- Why not TypeORM? Prisma has better TypeScript ergonomics and safer migrations.

### Databases

| DB | Use | Why not the other |
|---|---|---|
| PostgreSQL | Users, orders, payments | MongoDB bad for ACID transactions involving money |
| MongoDB | Content metadata, tarot decks, reading progress | Postgres bad for nested card arrays + flexible schema |
| Redis | OTP, sessions, rate limiting, job queue | Neither Postgres nor Mongo has TTL-native keys |

### File Storage — Cloudflare R2

- S3-compatible API — same SDK (`@aws-sdk/client-s3`) as AWS S3, zero code change to migrate later
- **10GB free** storage, **1M free requests/month**
- **No egress fees** — AWS S3 charges per GB downloaded. R2 does not.
- Signed URLs work identically to S3 signed URLs

### Email — Resend

- Developer-friendly API, React Email templates (design emails in JSX)
- Free: 100 emails/day, 3,000/month
- When scaling → swap for AWS SES with zero API change (same HTTP call pattern)

### Payment — Stripe + Omise

- **Stripe** — global standard, excellent TypeScript SDK, webhooks well-documented
- **Omise** — Thailand-specific, supports PromptPay QR (most Thai customers pay this way)
- Both implement `IPaymentProvider` interface → swap or add providers without changing business logic

---

## Package Versions (lock these, update intentionally)

### Frontend (`apps/web`)
```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "@tanstack/react-query": "5.x",
  "zustand": "4.x",
  "react-hook-form": "7.x",
  "zod": "3.x",
  "gsap": "3.x",
  "framer-motion": "11.x",
  "react-pdf": "7.x"
}
```

### Backend (`apps/api`)
```json
{
  "@nestjs/core": "10.x",
  "@nestjs/cqrs": "10.x",
  "prisma": "5.x",
  "mongoose": "8.x",
  "ioredis": "5.x",
  "bullmq": "5.x",
  "class-validator": "0.14.x",
  "class-transformer": "0.5.x",
  "jsonwebtoken": "9.x",
  "bcrypt": "5.x",
  "resend": "3.x",
  "stripe": "14.x",
  "@aws-sdk/client-s3": "3.x"
}
```

---

## NestJS ↔ .NET Mapping Cheatsheet

| .NET Concept | NestJS Equivalent |
|---|---|
| `IRequest<T>` (MediatR) | `ICommand<T>` / `IQuery<T>` |
| `IRequestHandler` | `@CommandHandler()` / `@QueryHandler()` |
| `AbstractValidator<T>` | class with `@IsString()`, `@IsEmail()` decorators |
| `IAuthorizationFilter` | `CanActivate` guard |
| `ActionFilterAttribute` | `NestInterceptor` |
| `IMiddleware` | `NestMiddleware` |
| `EfRepository<T>` | Prisma `PrismaService` or Mongoose model |
| `AddScopedModule()` | `@Module({ providers: [...] })` |
| `appsettings.json` | `.env` + `@nestjs/config` `ConfigService` |
| `BaseResult` | Custom `ApiResponse<T>` class (build same pattern) |
| `(bool success, string? msg)` | `{ success: boolean; message?: string }` |
