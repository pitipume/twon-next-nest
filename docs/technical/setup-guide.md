# Setup Guide — Windows & Mac

This guide gets you from zero to running on both machines.

---

## Prerequisites — Install Once Per Machine

### Windows (Current Laptop)

#### 1. Node.js 20 (via nvm-windows)
```powershell
# Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
# Install nvm-windows, then:
nvm install 20
nvm use 20

# Verify
node -v    # should show v20.x.x
npm -v     # should show 10.x.x
```

#### 2. Docker Desktop
```
Download from: https://www.docker.com/products/docker-desktop/
Install → restart → open Docker Desktop → wait until it shows "Running"
```

#### 3. Git
```
Download from: https://git-scm.com/download/win
```

#### 4. Verify all tools
```powershell
node -v
npm -v
docker -v
docker compose version
git -v
```

---

### Mac (Personal Laptop)

#### 1. Homebrew (Mac package manager — install this first)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Node.js 20 (via nvm)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.zshrc    # or ~/.bash_profile if using bash

# Install Node 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v    # v20.x.x
npm -v     # 10.x.x
```

#### 3. Docker Desktop for Mac
```
Download from: https://www.docker.com/products/docker-desktop/
Choose: Apple Silicon (M1/M2/M3) OR Intel — check your Mac in Apple menu → About This Mac
Install → drag to Applications → open → wait for "Running"
```

#### 4. Git (usually pre-installed on Mac)
```bash
git -v
# If not found:
brew install git
```

#### 5. Verify all tools
```bash
node -v
npm -v
docker -v
docker compose version
git -v
```

---

## Project Setup — First Time (Both Platforms)

### Step 1 — Clone the repo
```bash
# Windows (PowerShell or Git Bash)
git clone <your-repo-url> project-ebook
cd project-ebook

# Mac
git clone <your-repo-url> project-ebook
cd project-ebook
```

### Step 2 — Install all dependencies
```bash
# From the root of the monorepo
npm install

# This installs dependencies for:
#   - root (turbo, prettier)
#   - apps/web (Next.js + all frontend packages)
#   - apps/api (NestJS + all backend packages)
```

### Step 3 — Set up environment variables

**Backend:**
```bash
# Windows
copy apps\api\.env.example apps\api\.env

# Mac
cp apps/api/.env.example apps/api/.env
```

Then open `apps/api/.env` and fill in:
```env
# These work as-is for local Docker setup — no changes needed:
DATABASE_URL=postgresql://aura:aura_dev@localhost:5432/aura_db
MONGODB_URI=mongodb://aura:aura_dev@localhost:27017/aura?authSource=admin
REDIS_URL=redis://localhost:6379

# Change these to random strings:
JWT_ACCESS_SECRET=any-long-random-string-here
JWT_REFRESH_SECRET=another-long-random-string-here

# Leave blank for now (fill when you set up services):
RESEND_API_KEY=
STRIPE_SECRET_KEY=
R2_ACCESS_KEY_ID=
# ... etc
```

**Frontend:**
```bash
# Windows
copy apps\web\.env.example apps\web\.env.local

# Mac
cp apps/web/.env.example apps/web/.env.local
```

`apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 4 — Start local databases
```bash
# From project root (both Windows and Mac)
docker compose up -d

# Verify all 3 containers are running:
docker compose ps
# Should show: aura_postgres, aura_mongodb, aura_redis — all "healthy"
```

### Step 5 — Run database migrations
```bash
cd apps/api

# Create the DB tables from schema.prisma
npx prisma migrate dev --name init

# Generate Prisma client TypeScript types
npx prisma generate
```

### Step 6 — Start the project
```bash
# From project root — starts both frontend and backend simultaneously
npm run dev

# Or start individually:
cd apps/api && npm run start:dev    # NestJS on http://localhost:3001
cd apps/web && npm run dev          # Next.js on http://localhost:3000
```

### Step 7 — Verify it's working
```
Frontend:  http://localhost:3000    → should show Next.js page
Backend:   http://localhost:3001    → should show NestJS response
Prisma:    cd apps/api && npx prisma studio   → visual DB browser at http://localhost:5555
```

---

## Moving the Project from Windows to Mac

### Option A — via Git (recommended)
```bash
# On Windows — push to GitHub first
git add .
git commit -m "initial scaffold"
git push origin main

# On Mac — clone it
git clone <your-repo-url> project-ebook
cd project-ebook
# Then follow "Project Setup — First Time" above
```

### Option B — via USB/Copy
```
1. Copy the entire project-ebook folder
2. But DELETE these folders first (they're too large and OS-specific):
   - apps/api/node_modules
   - apps/web/node_modules
   - apps/web/.next
3. On Mac, run: npm install  (reinstalls everything fresh for Mac)
```

---

## Daily Development Commands

```bash
# Start everything (from project root)
docker compose up -d    # start databases
npm run dev             # start both apps

# Stop everything
docker compose down     # stop databases (data is preserved in volumes)
Ctrl+C                  # stop the dev server

# Wipe databases and start fresh (caution!)
docker compose down -v  # -v removes volumes = deletes all data

# Prisma helpers
cd apps/api
npx prisma studio                         # visual DB browser
npx prisma migrate dev --name <name>      # create + run a new migration
npx prisma migrate reset                  # wipe DB and re-run all migrations
npx prisma generate                       # regenerate TypeScript types after schema change
npx prisma db seed                        # run seed script (when added)

# Run tests
npm run test                # from root — runs all tests via turbo
cd apps/api && npm run test # just backend tests
cd apps/web && npm run test # just frontend tests

# Lint and format
npm run lint      # check for lint errors
npm run format    # auto-format all files
```

---

## Package List Reference

### Backend (`apps/api`) — Key Packages

| Package | Purpose |
|---|---|
| `@nestjs/core` | NestJS framework core |
| `@nestjs/cqrs` | Commands + Queries (= MediatR) |
| `@nestjs/config` | Environment variable management |
| `@nestjs/jwt` | JWT token signing/verification |
| `@nestjs/passport` + `passport-jwt` | JWT authentication strategy |
| `@nestjs/websockets` + `socket.io` | WebSocket (real-time) |
| `@prisma/client` + `prisma` | PostgreSQL ORM |
| `mongoose` + `@nestjs/mongoose` | MongoDB ODM |
| `ioredis` | Redis client |
| `bullmq` | Job queue (background tasks) |
| `class-validator` | DTO validation decorators (= FluentValidation) |
| `class-transformer` | Transform plain objects to class instances |
| `bcrypt` | Password hashing |
| `resend` | Email sending (OTP, receipts) |
| `stripe` | Stripe payments |
| `@aws-sdk/client-s3` | Cloudflare R2 / S3 file storage |
| `@aws-sdk/s3-request-presigner` | Generate signed URLs for R2/S3 |

### Frontend (`apps/web`) — Key Packages (install these)

```bash
cd apps/web

# UI components
npx shadcn@latest init   # sets up shadcn/ui (run once, follow prompts)

# State + data fetching
npm install zustand @tanstack/react-query @tanstack/react-query-devtools

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# Animation
npm install gsap framer-motion

# PDF viewer
npm install react-pdf

# HTTP client
npm install axios

# Icons
npm install lucide-react
```

---

## Common Problems & Fixes

| Problem | Fix |
|---|---|
| `docker compose up` fails — port in use | Another process is using port 5432/27017/6379. Run `docker compose down` then try again |
| `npx prisma migrate dev` fails — connection refused | Docker containers not running. Run `docker compose up -d` first |
| `node_modules` errors after copying from Windows to Mac | Delete all `node_modules` folders and run `npm install` fresh |
| NestJS can't find `@prisma/client` types | Run `npx prisma generate` in `apps/api` |
| Windows path issues in Docker volumes | Ensure Docker Desktop has file sharing enabled for your drive (Docker Desktop → Settings → Resources → File Sharing) |
