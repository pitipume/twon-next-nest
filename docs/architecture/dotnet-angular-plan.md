# Twon Platform — Angular + C# .NET Architecture Plan

> This is the planned architecture for the enterprise stack version of Twon.
> Business rules and data models are shared — see `docs/START-HERE.md`.
> This doc covers only tech-stack-specific decisions.

---

## Why Angular + C# .NET?

| Reason | Detail |
|---|---|
| Enterprise familiarity | Poom has prior .NET/Angular experience from aviation engineering work |
| Strong typing end-to-end | C# + TypeScript = full type safety on both sides |
| .NET ecosystem | ASP.NET Core is battle-tested for Thai enterprise/government projects |
| Angular DI | Mirrors .NET DI patterns — mental model transfers directly |
| Future-proof | Large team → Angular's opinionated structure scales better than React |

---

## Tech Stack

### Frontend — Angular
- **Framework:** Angular 17+ (standalone components, signals)
- **Styling:** Tailwind CSS + Angular Material (or PrimeNG)
- **HTTP:** Angular HttpClient + RxJS
- **State:** NgRx (or simpler: Angular signals + services)
- **Forms:** Angular Reactive Forms + Zod (or class-validator on DTO classes)
- **Animation:** GSAP (tarot shuffle) + Angular Animations (UI transitions)
- **PDF Viewer:** ng2-pdf-viewer (PDF.js wrapper)
- **Routing:** Angular Router with lazy-loaded feature modules

### Backend — C# .NET
- **Framework:** ASP.NET Core 8 Web API
- **Pattern:** MediatR (CQRS) — same Command/Query pattern as NestJS version
- **Auth:** JWT Bearer + Refresh token (HttpOnly cookie) — identical flow to NestJS
- **ORM:** Entity Framework Core (PostgreSQL via Npgsql)
- **MongoDB:** MongoDB.Driver (official C# driver)
- **Redis:** StackExchange.Redis
- **Email:** Resend (has C# SDK)
- **Storage:** AWSSDK.S3 (Cloudflare R2 is S3-compatible)
- **Validation:** FluentValidation
- **Background jobs:** Hangfire (equivalent to BullMQ)

---

## Layer Architecture (mirrors NestJS version exactly)

```
Controller   → MediatR.Send()              — no logic (= NestJS Controller)
Handler      → IRequestHandler<,>          — normalize → validate → call manager (= NestJS Handler)
Manager      → class XManager              — business logic only (= NestJS Manager)
Service      → class XService              — data access only (= NestJS Service)
Repository   → EF Core / MongoDB.Driver    — no logic (= NestJS Repository)
```

This is identical to what Poom already built in NestJS — just C# syntax.

---

## Project Structure

```
/twon-dotnet-angular/
├── CLAUDE.md                    ← tech-specific AI instructions
├── /docs → symlink or copy of /docs/START-HERE.md
├── /frontend                    ← Angular app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/            ← auth, guards, interceptors, services
│   │   │   ├── shared/          ← shared components, pipes, directives
│   │   │   └── features/
│   │   │       ├── catalog/
│   │   │       ├── library/
│   │   │       ├── checkout/
│   │   │       └── admin/
│   │   └── environments/
│   └── angular.json
└── /backend                     ← ASP.NET Core Web API
    ├── Twon.API/
    │   ├── Controllers/
    │   └── Program.cs
    ├── Twon.Application/        ← MediatR Commands + Queries + Handlers
    │   ├── Auth/
    │   ├── Catalog/
    │   ├── Library/
    │   ├── Store/
    │   ├── Payment/
    │   └── Admin/
    ├── Twon.Domain/             ← Entities, enums, business rules
    ├── Twon.Infrastructure/     ← EF Core, MongoDB, Redis, R2, Email
    └── Twon.sln
```

---

## Module Mapping — NestJS → .NET

| NestJS (current) | .NET equivalent |
|---|---|
| `@Module()` | Feature folder + DI registration in `Program.cs` |
| `@Controller()` | `[ApiController]` + `[Route()]` |
| `@CommandHandler` | `IRequestHandler<Command, Result>` |
| `@QueryHandler` | `IRequestHandler<Query, Result>` |
| `CommandBus.execute()` | `_mediator.Send(command)` |
| `@Injectable()` Manager/Service | `class` registered with `services.AddScoped<>()` |
| `PrismaService` | `DbContext` (EF Core) |
| `JwtAuthGuard` | `[Authorize]` + JWT Bearer middleware |
| `@Roles()` decorator | `[Authorize(Roles = "Admin")]` |
| `@CurrentUser()` decorator | `User.FindFirst(ClaimTypes.NameIdentifier)` |
| `class-validator` | `FluentValidation` |
| `ApiResponse<T>` | `BaseResult<T>` (same pattern) |

---

## Auth Flow (identical to NestJS version)

```
POST /api/auth/register/initiate  → generate OTP → store SHA-256 hash in Redis (5min TTL)
POST /api/auth/register/verify    → verify OTP → create user → return JWT + set refresh cookie
POST /api/auth/login              → verify password → return JWT + set refresh cookie
POST /api/auth/refresh            → verify refresh token → rotate → return new JWT
POST /api/auth/logout             → revoke refresh token
```

JWT: access token 15min, refresh token 7 days (HttpOnly cookie, rotated on use).

---

## CLAUDE.md for the .NET/Angular repo

When you create the new repo, put this in `CLAUDE.md`:

```markdown
# CLAUDE.md — Twon Platform (Angular + C# .NET)

> Read docs/START-HERE.md FIRST for business rules and shared data models.
> This file covers only tech-stack-specific decisions for this repo.

## Stack
- Frontend: Angular 17+ (standalone components, signals, Tailwind CSS)
- Backend: ASP.NET Core 8 Web API + MediatR (CQRS)
- ORM: Entity Framework Core (PostgreSQL) + MongoDB.Driver
- Auth: JWT Bearer + HttpOnly refresh cookie

## Layer pattern (same as NestJS version, C# syntax)
Controller → MediatR.Send() → Handler → Manager → Service → Repository

## Key references
- Business rules: docs/START-HERE.md
- NestJS version for reference: github.com/pitipume/project-ebook
- Architecture plan: docs/architecture/dotnet-angular-plan.md

## AI Assistant Guidelines
- Always use Edit tool for existing files
- Write tool only for brand new files
- Follow the same layer pattern as NestJS — just C# syntax
- MediatR = @nestjs/cqrs, IRequestHandler = @CommandHandler/@QueryHandler
```

---

## How to start the .NET/Angular version

When ready:

```bash
# Create new repo
mkdir twon-dotnet-angular && cd twon-dotnet-angular
git init

# Backend scaffold
dotnet new sln -n Twon
dotnet new webapi -n Twon.API -o backend/Twon.API
dotnet new classlib -n Twon.Application -o backend/Twon.Application
dotnet new classlib -n Twon.Domain -o backend/Twon.Domain
dotnet new classlib -n Twon.Infrastructure -o backend/Twon.Infrastructure
dotnet sln add backend/**/*.csproj

# Frontend scaffold
cd frontend
npm install -g @angular/cli
ng new twon-frontend --style=css --routing=true --standalone=true
cd twon-frontend
npm install tailwindcss @tailwindcss/postcss gsap ng2-pdf-viewer
```

---

## What transfers from the NestJS version

Everything business-logic-related transfers directly — only syntax changes:

| Transfers | What changes |
|---|---|
| Auth flow (OTP, JWT, refresh) | `crypto` → `System.Security.Cryptography` |
| CQRS pattern | `@nestjs/cqrs` → `MediatR` |
| Signed URL logic | Same R2 SDK (S3-compatible) |
| Payment flow (slip → approve → library) | Same state machine |
| All API endpoints | Same routes, same request/response shapes |
| Business rules | Identical |
| MongoDB schemas | Same fields, different driver syntax |
| Redis OTP pattern | Same TTL/hash logic |

The Angular frontend maps 1:1 to Next.js pages — same routes, same API calls.
