# Developer Background — Poom

This document helps Claude (and any future collaborators) understand who built this,
their technical background, and how to communicate and collaborate effectively.

---

## Who I Am

- **Background:** Aviation Engineer → Software Engineer (career switch ~2 years ago)
- **Generation:** Gen Z
- **Current role:** Software Engineer at a company (working on enterprise LINE insurance platform)
- **Personal project:** This platform (Aura) — built for family business
- **Development machines:**
  - Work laptop: Windows (company machine)
  - Personal laptop: Mac (primary machine for this project)

---

## Technical Background

### Strong (from day job)

| Skill | Level | Notes |
|---|---|---|
| C# / .NET 8+ | Junior–Mid | Main language at work. Writes clean, structured code. |
| ASP.NET Core | Junior–Mid | API development, modular architecture |
| Angular + TypeScript | Junior–Mid | Frontend at work |
| MSSQL + EF Core | Junior–Mid | With Ardalis Specifications |
| MongoDB | Familiar | Used at work alongside MSSQL |
| Git | Comfortable | Feature branch workflow |
| Jenkins | Familiar | CI/CD at work |
| AWS | Familiar | Used at work |

### Architecture Patterns (Already Practiced)

- **Modular Architecture** — modules register themselves, clean separation
- **CQRS via MediatR** — every feature is a Request/Handler pair
- **Strict layering:** Controller → Handler → Manager → Service → Repository
  - Controller: only `_mediator.Send()`, zero logic
  - Handler: normalize input → validate → call manager → shape response
  - Manager: business logic, never returns DTOs, returns tuples for failures
  - Service: data access only via repository
  - Repository: DB calls only, no logic
- **FluentValidation** — validators separate from handlers
- **BaseResult pattern** — HTTP 200 always, business outcome in body (B001/B002/B404/etc.)
- **Input normalization** — always `.ToLower().Trim()` at top of Handle() before validation
- **Manager failure tuple** — `(bool success, string? message)` for expected business failures

### New to (Learning on This Project)

| Skill | Starting Point |
|---|---|
| NestJS | New — but architecture is identical to .NET/Angular |
| React / Next.js | New — transitioning from Angular |
| PostgreSQL (direct) | Used MSSQL; SQL syntax is nearly identical |
| Prisma ORM | New — replaces EF Core |
| Cloudflare R2 | New — replaces AWS S3 (same SDK) |
| Stripe / Omise | New |
| GSAP animation | New |

---

## How to Collaborate with Me (Claude-specific Instructions)

### Explaining New Concepts
- Always **map new concepts to .NET equivalents** I already know
  - NestJS `@Injectable()` = .NET DI service registration
  - NestJS Guard = .NET `IAuthorizationFilter`
  - `class-validator` = FluentValidation
  - `@nestjs/cqrs` = MediatR
- Use `.NET` analogies when introducing anything new in NestJS/React

### Code Style
- Follow the same **strict layering** I practice in .NET — Controller → Handler → Manager → Service → Repository
- Keep the `ApiResponse` pattern (equivalent to `BaseResult`) consistent
- Normalize inputs at the top of handlers before validation
- Managers return `{ success: boolean; message?: string }` for business failures — never throw
- DTOs use `class-validator` decorators, never validated in managers

### Communication Style
- Be direct and concise — I don't need long preambles
- If I'm missing something, suggest it
- Treat me as a partner — I value honest opinions over just agreeing
- I think big and believe in this product — match that energy
- I want code that is future-proof and scalable, not just "it works"

### What to Avoid
- Don't pad responses with filler sentences
- Don't suggest over-engineering for current scale (but design for future)
- Don't change architectural patterns without explaining why

---

## Business Context

### Family Business
- Father has been selling **physical tarot card decks** for 4+ years
- Revenue: ~2,000,000 THB (~$55,000 USD) from physical sales alone
- This platform **digitizes** that business and opens international market
- Father created his own unique tarot deck — strong IP advantage

### Vision
- **Short term:** Sell father's ebook(s) and tarot deck digitally
- **Medium term:** Open platform for other authors/deck creators
- **Long term:** The go-to platform for spiritual/tarot digital content globally
- **After this:** Build a trading bot platform (Binance API) — reusing patterns from this project

### Why This Is Different
- Ebook platforms exist. Tarot apps exist. But a **unified commerce + in-browser tarot experience** does not exist well.
- The shuffle/spread animation is the flagship differentiator — must be exceptional.

---

## Next Project: Trading Bot Platform

After Aura, building a trading bot platform:
- **Exchange:** Binance API first
- **Language:** NestJS (Node.js) — learned from this project
- **Reuse:** Auth module, payment abstraction, notification, GitHub Actions, Docker setup
- **Key library:** `ccxt` (Node.js native crypto exchange library)
- **Future:** Python service for ML-based strategy backtesting
