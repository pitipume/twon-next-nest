# Infrastructure — External Services

All services below are used by the NestJS + Next.js implementation.

---

## Databases

| Service | Purpose | Provider | Free tier |
|---|---|---|---|
| PostgreSQL | Users, orders, payments, library | Neon (cloud) or Docker | Neon free tier |
| MongoDB | Ebook metadata, tarot deck config | Atlas M0 | Forever free |
| Redis | OTP, sessions, rate limiting, cache | Upstash (cloud) or Docker | Free tier |

### Local (Docker — `docker-compose.yml`)
```env
DATABASE_URL=postgresql://twon:twon_dev@localhost:5432/twon_db
MONGODB_URI=mongodb://twon:twon_dev@localhost:27017/twon?authSource=admin
REDIS_URL=redis://localhost:6379
```

### Cloud
```env
DATABASE_URL=postgresql://...      # from neon.tech
MONGODB_URI=mongodb+srv://...      # from mongodb.com/atlas
REDIS_URL=rediss://...             # from upstash.com
```

---

## File Storage — Cloudflare R2

S3-compatible object storage. 10GB free, no egress fees.

```env
R2_ACCOUNT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=twon
R2_ACCESS_KEY_ID=           # from R2 → Manage API Tokens
R2_SECRET_ACCESS_KEY=       # from R2 → Manage API Tokens (shown once only)
```

Sign up: **cloudflare.com** → R2 → Manage API Tokens → Create token (Object Read & Write)

---

## Email — Resend

OTP delivery and order confirmations. 100 emails/day free.

```env
RESEND_API_KEY=             # leave blank in dev — OTP prints to console
EMAIL_FROM=noreply@twon-platform.com
```

> In development, leave `RESEND_API_KEY` blank.
> The backend will print OTP codes to the terminal instead of sending emails.

Sign up: **resend.com** → API Keys

---

## Auth

```env
JWT_ACCESS_SECRET=          # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_REFRESH_SECRET=         # generate separately with same command
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Full `.env` for `apps/api`

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000   # used for CORS — update to Vercel URL in production

# PostgreSQL
DATABASE_URL=postgresql://twon:twon_dev@localhost:5432/twon_db

# MongoDB
MONGODB_URI=mongodb://twon:twon_dev@localhost:27017/twon?authSource=admin

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
R2_ACCOUNT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=twon
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@twon-platform.com

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Hosting

| Service | What | Provider | Cost |
|---|---|---|---|
| Frontend (Next.js) | Static + SSR | Vercel | Free |
| Backend (NestJS) | API server | Railway | Free / $5/month |
| Domain | twon.com (future) | Cloudflare | ~$10/year |
