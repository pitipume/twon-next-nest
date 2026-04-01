# Cloud Databases Setup (Option B — No Docker)

> Use this guide when Docker is not available (e.g. work laptop without admin rights).
> All services below are **free tier** and require no credit card.
> Do this on your **personal laptop** before running the backend.

---

## Step 1 — PostgreSQL via Neon

1. Go to **https://neon.tech** → Sign up (GitHub login works)
2. Create project → name it `twon`
3. It auto-creates a database
4. Click **"Connection string"** → copy the URL:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Paste into `apps/api/.env` as:
   ```env
   DATABASE_URL=postgresql://...
   ```

---

## Step 2 — MongoDB via Atlas

1. Go to **https://mongodb.com/atlas** → Sign up
2. Create a **free M0 cluster** → pick any region
3. **Database Access** (left sidebar) → Add database user → set username + password
4. **Network Access** (left sidebar) → Add IP address → click **"Allow access from anywhere"** (`0.0.0.0/0`)
5. **Connect** (on your cluster) → Drivers → copy the connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/twon?retryWrites=true&w=majority
   ```
   > Replace `<password>` with the password you set in step 3
6. Paste into `apps/api/.env` as:
   ```env
   MONGODB_URI=mongodb+srv://...
   ```

---

## Step 3 — Redis via Upstash

1. Go to **https://upstash.com** → Sign up (GitHub login works)
2. Create database → name `twon` → pick region closest to you → **Free tier**
3. After creation, go to the database → **"Connect"** tab
4. Copy the **Redis URL**:
   ```
   redis://default:password@xxx.upstash.io:6379
   ```
5. Paste into `apps/api/.env` as:
   ```env
   REDIS_URL=redis://...
   ```

---

## Step 4 — Fill in `apps/api/.env`

Your `.env` should have at minimum:

```env
# Databases (cloud — no Docker needed)
DATABASE_URL=postgresql://...        ← from Neon
MONGODB_URI=mongodb+srv://...        ← from Atlas
REDIS_URL=redis://...                ← from Upstash

# JWT (generate any random string)
JWT_SECRET=change-me-to-random-string-min-32-chars
JWT_REFRESH_SECRET=another-random-string-min-32-chars

# Email (leave blank for dev — OTP will print to terminal instead)
RESEND_API_KEY=

# Storage (leave blank for now — needed only when uploading files)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=twon-storage
R2_PUBLIC_URL=

# App
PORT=3001
NODE_ENV=development
EMAIL_FROM=noreply@twon-platform.com
```

---

## Step 5 — Run migrations + start backend

```bash
cd apps/api

# Install dependencies (first time only)
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables in Neon)
npx prisma migrate dev --name init

# Start backend
npm run start:dev
# → running at http://localhost:3001/api
```

---

## Step 6 — Start frontend

```bash
cd apps/web

# Install dependencies (first time only)
npm install

# Remove duplicate route file (one-time fix)
rm src/app/\(main\)/page.tsx

# Start frontend
npm run dev
# → running at http://localhost:3000
```

---

## Quick Generate JWT Secrets

Run this in any terminal to generate secure random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Run twice — use one for JWT_SECRET, one for JWT_REFRESH_SECRET
```

---

## Summary — What you need from each service

| What | Service | Where to find it |
|---|---|---|
| `DATABASE_URL` | Neon | Project → Connection string |
| `MONGODB_URI` | Atlas | Cluster → Connect → Drivers |
| `REDIS_URL` | Upstash | Database → Connect → Redis URL |
