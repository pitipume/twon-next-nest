# CLI Commands Reference

> **Important:** All commands here are run in **your own terminal** (PowerShell, Git Bash, or Windows Terminal on Windows — Terminal on Mac).
> Claude Code's built-in bash tool does NOT have Docker or your local Node.js environment — it cannot run these for you.
> Open a terminal yourself, `cd` to the project root, and run them directly.

Run all commands from the **project root** unless stated otherwise.

---

## Docker (Local Databases)

```bash
# Start all databases (PostgreSQL + MongoDB + Redis) in background
docker compose up -d

# Check if all 3 containers are healthy
docker compose ps

# Stop containers (data preserved in volumes)
docker compose down

# View logs for a specific container
docker compose logs postgres
docker compose logs mongodb
docker compose logs redis

# Wipe ALL data and start fresh (destructive!)
docker compose down -v
```

---

## Prisma (Database Schema & Migrations)

Run from `apps/api/`:

```bash
cd apps/api

# Generate Prisma Client TypeScript types after schema change
npx prisma generate

# Create + apply a new migration (run after editing schema.prisma)
npx prisma migrate dev --name <describe-change>
# Examples:
npx prisma migrate dev --name init
npx prisma migrate dev --name add-user-avatar
npx prisma migrate dev --name add-product-discount

# Apply migrations in production (no new migration created)
npx prisma migrate deploy

# Reset DB — wipe all data, re-run all migrations from scratch
npx prisma migrate reset

# Open visual DB browser at http://localhost:5555
npx prisma studio

# Check migration status
npx prisma migrate status

# Pull current DB schema into schema.prisma (if DB changed externally)
npx prisma db pull

# Push schema changes directly without migration (dev only, no migration file)
npx prisma db push
```

---

## Backend — NestJS (`apps/api`)

```bash
cd apps/api

# Start in watch mode (hot reload — use this during development)
npm run start:dev

# Start once (no reload)
npm run start

# Build for production
npm run build

# Start production build
npm run start:prod

# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run e2e tests
npm run test:e2e

# Lint
npm run lint

# Format
npm run format
```

---

## Frontend — Next.js (`apps/web`)

```bash
cd apps/web

# Install all new dependencies (first time after frontend was scaffolded)
npm install

# ⚠️  ONE-TIME FIX: Delete the conflicting duplicate route file
# (both app/page.tsx and app/(main)/page.tsx map to "/" — only one allowed)
# Run once after npm install, then never again:
rm src/app/\(main\)/page.tsx

# Start dev server at http://localhost:3000
npm run dev

# Build for production
npm run build

# Start production build
npm run start

# Lint
npm run lint
```

### Frontend pages (all routes)

| URL | Page |
|---|---|
| `/` | Home — catalog browse |
| `/auth/login` | Login |
| `/auth/register` | Register (sends OTP) |
| `/auth/verify?email=...` | OTP verification |
| `/catalog/:id` | Product detail + buy |
| `/checkout/:orderId` | Payment QR + slip upload |
| `/library` | My purchased items |
| `/library/ebook/:id` | PDF ebook reader |
| `/library/tarot/:id` | Tarot shuffle + spread |
| `/admin` | Admin dashboard |
| `/admin/upload` | Upload ebook or tarot deck |
| `/admin/orders` | Approve/reject pending payments |
| `/admin/config` | Set bank details + upload QR |

---

## Run Both Apps at Once (from root)

```bash
# Requires turbo installed (it is — in root devDependencies)
npm run dev        # starts apps/api + apps/web in parallel

# Build all
npm run build

# Test all
npm run test

# Lint all
npm run lint
```

---

## First-Time Project Setup (Full Sequence)

Run this exactly once on a new machine:

```bash
# 1. Install all dependencies (root + all workspaces)
npm install

# 2. Set up backend env
cp apps/api/.env.example apps/api/.env
# Then open apps/api/.env and fill in secrets

# 3. Set up frontend env — already created at apps/web/.env.local
# Edit if API URL is different from http://localhost:3001/api

# 4. ⚠️  One-time frontend fix: remove duplicate route file
cd apps/web && rm src/app/\(main\)/page.tsx && cd ../..

# 5. Start databases
docker compose up -d

# 6. Wait ~10 seconds for Postgres to be ready, then migrate
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
cd ../..

# 7. Start everything
npm run dev
```

---

## Environment — Apps Running

| App | URL | Notes |
|---|---|---|
| Frontend (Next.js) | http://localhost:3000 | |
| Backend (NestJS) | http://localhost:3001/api | All routes prefixed with /api |
| Prisma Studio | http://localhost:5555 | Run `npx prisma studio` in apps/api |
| PostgreSQL | localhost:5432 | User: twon / Pass: twon_dev / DB: twon_db |
| MongoDB | localhost:27017 | User: twon / Pass: twon_dev |
| Redis | localhost:6379 | No auth locally |

---

## Auth API Endpoints (Manual Testing)

Test with curl or Postman/Bruno/Insomnia.

### Step 1 — Initiate Register (sends OTP email)
```bash
curl -X POST http://localhost:3001/api/auth/register/initiate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "displayName": "Test User"}'
```

### Step 2 — Verify OTP + Create Account
```bash
curl -X POST http://localhost:3001/api/auth/register/verify \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "otp": "123456", "password": "Password123"}'
# -c cookies.txt saves the refresh token HttpOnly cookie
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "Password123"}'
```

### Refresh Token
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt    # sends the saved HttpOnly cookie
```

### Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -b cookies.txt
```

---

## Git Workflow

```bash
# Check status
git status
git log --oneline -10

# Feature branch
git checkout -b feature/<feature-name>

# Stage and commit
git add apps/api/src/modules/auth/
git commit -m "feat(auth): add OTP registration flow"

# Push and open PR
git push origin feature/<feature-name>
```

### Commit message convention
```
feat(module):   new feature
fix(module):    bug fix
refactor:       code change, no feature/fix
docs:           documentation only
test:           adding tests
chore:          tooling, dependencies
```

---

## NestJS CLI (Scaffold)

Generate boilerplate (from `apps/api/`):

```bash
cd apps/api

# Generate a new module
npx nest generate module modules/catalog

# Generate a controller
npx nest generate controller modules/catalog/catalog --no-spec

# Generate a service
npx nest generate service modules/catalog/managers/catalog-manager --no-spec

# Note: We don't use `nest generate` for handlers — create them manually
# to follow our Controller → Handler → Manager → Service → Repository pattern
```

---

## Useful One-Liners

```bash
# See what's running on a port (Windows)
netstat -ano | findstr :3001

# See what's running on a port (Mac)
lsof -i :3001

# Kill process on port (Mac)
kill -9 $(lsof -ti:3001)

# Clear npm cache if packages behave strangely
npm cache clean --force

# Delete all node_modules and reinstall (nuclear option)
# Windows PowerShell:
Get-ChildItem -Path . -Filter "node_modules" -Recurse -Directory | Remove-Item -Recurse -Force
npm install

# Mac:
find . -name "node_modules" -type d -prune -exec rm -rf {} +
npm install
```
