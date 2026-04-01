# Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 20+ (use `nvm` on Mac: `nvm install 20 && nvm use 20`)
- Docker Desktop (for local PostgreSQL, MongoDB, Redis)
- Git

### First-time Setup
```bash
# Clone and install
git clone <repo>
cd project-ebook
npm install        # installs all workspaces

# Start local databases
docker compose up -d

# Setup backend
cd apps/api
cp .env.example .env    # fill in values
npx prisma migrate dev  # run DB migrations
npx prisma db seed      # seed initial data (optional)

# Setup frontend
cd apps/web
cp .env.example .env.local

# Run both in parallel (from root)
npm run dev
```

### Local Services (docker-compose)
| Service | Port | Credentials |
|---|---|---|
| PostgreSQL | 5432 | `aura` / `aura_dev` / db `aura_db` |
| MongoDB | 27017 | `aura` / `aura_dev` |
| Redis | 6379 | no auth (local only) |

---

## Hosting Stack (Current — Zero/Low Cost)

### Frontend — Vercel
- Connect GitHub repo → auto-deploy on push to `main`
- Preview deployments on every PR (free)
- Environment variables set in Vercel dashboard
- Custom domain: add in Vercel → update DNS

### Backend — Railway
- Connect GitHub repo → select `apps/api` as root
- Set build command: `npm run build`
- Set start command: `npm run start:prod`
- Add PostgreSQL plugin in Railway dashboard
- Environment variables in Railway dashboard
- Railway gives a URL like `api.railway.app` → set as `NEXT_PUBLIC_API_URL` in Vercel

### MongoDB — Atlas
- Create free M0 cluster at cloud.mongodb.com
- Whitelist Railway's outbound IP (or use 0.0.0.0/0 for dev)
- Get connection string → set as `MONGODB_URI` in Railway

### Redis — Upstash
- Create free database at upstash.com
- Get `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN`
- Set in Railway environment variables

### File Storage — Cloudflare R2
- Create R2 bucket at dash.cloudflare.com
- Create API token with R2 read+write permissions
- Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- R2 uses S3-compatible API — use `@aws-sdk/client-s3` with R2 endpoint

### Email — Resend
- Create account at resend.com
- Get API key → set as `RESEND_API_KEY`
- Verify your sending domain (add DNS TXT records)

---

## Environment Variables

### Backend (`apps/api/.env`)
```env
# App
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# JWT
JWT_ACCESS_SECRET=your-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d

# PostgreSQL
DATABASE_URL=postgresql://aura:aura_dev@localhost:5432/aura_db

# MongoDB
MONGODB_URI=mongodb://aura:aura_dev@localhost:27017/aura?authSource=admin

# Redis (local)
REDIS_URL=redis://localhost:6379
# Redis (Upstash — production)
# UPSTASH_REDIS_URL=
# UPSTASH_REDIS_TOKEN=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=aura-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # or custom domain

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@yourdomain.com

# Payment
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
OMISE_PUBLIC_KEY=pkey_test_xxx
OMISE_SECRET_KEY=skey_test_xxx

# Sentry (optional)
SENTRY_DSN=
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_SENTRY_DSN=
```

---

## CI/CD — GitHub Actions

### Workflow: PR Check (`.github/workflows/pr-check.yml`)
Runs on every pull request:
1. Lint (ESLint)
2. Type check (tsc --noEmit)
3. Unit tests
4. Build check

### Workflow: Deploy (`.github/workflows/deploy.yml`)
Runs on push to `main`:
- Frontend: Vercel auto-deploys via GitHub integration (no action needed)
- Backend: Railway auto-deploys via GitHub integration (no action needed)

For manual control:
```yaml
- uses: railwayapp/railway-cli@v3
  with:
    command: up --service api
```

---

## Migration to AWS (Future)

When ready to move to AWS, zero code changes needed:

| Current | AWS Equivalent | Change needed |
|---|---|---|
| Vercel | ECS Fargate + CloudFront | Dockerfile already exists |
| Railway Postgres | RDS PostgreSQL | Change `DATABASE_URL` |
| Railway backend | ECS Fargate | Dockerfile already exists |
| Cloudflare R2 | AWS S3 | Change endpoint URL in config |
| Upstash Redis | ElastiCache | Change `REDIS_URL` |
| Resend | AWS SES | Change email provider class |

All infrastructure changes are **env var changes + Dockerfile deployment** — no business logic changes.
