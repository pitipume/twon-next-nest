# Personal Laptop Setup — Start Here

> Follow this guide **in order** when setting up the project on your personal laptop for the first time.

---

## Prerequisites (install these first)

- [ ] **Node.js 20+** — https://nodejs.org → download LTS
- [ ] **Git** — https://git-scm.com
- [ ] **Docker Desktop** — https://docker.com/products/docker-desktop (install with WSL2 option checked)
- [ ] **VS Code** — https://code.visualstudio.com (optional but recommended)

Verify installs:
```bash
node -v       # should show v20.x.x
npm -v        # should show 10.x.x
git -v        # should show git version x.x
docker -v     # should show Docker version x.x
```

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/pitipume/project-ebook.git
cd project-ebook
```

---

## Step 2 — Install all dependencies

```bash
# From project root — installs everything (api + web + root)
npm install
```

---

## Step 3 — Create backend `.env`

```bash
cp apps/api/.env.example apps/api/.env
```

Then open `apps/api/.env` and fill in:

```env
# Databases — choose Docker (A) or Cloud (B) below
DATABASE_URL=
MONGODB_URI=
REDIS_URL=

# JWT secrets — generate with the command below
JWT_SECRET=
JWT_REFRESH_SECRET=

# Email — leave blank in dev (OTP will print to terminal)
RESEND_API_KEY=

# Storage — leave blank until you set up Cloudflare R2
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

Generate JWT secrets:
```bash
# Run twice — use first output for JWT_SECRET, second for JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4A — Start databases with Docker (personal laptop)

### 4A-1. Install Docker Desktop (first time only)

1. Download from **https://docker.com/products/docker-desktop**
2. Run the installer
3. When asked: **enable WSL2 integration** (tick the checkbox)
4. After install → restart your computer
5. Open Docker Desktop → wait until the whale icon in taskbar stops animating (means it's ready)
6. Verify in terminal:
   ```bash
   docker -v
   # Docker version 27.x.x
   docker compose version
   # Docker Compose version v2.x.x
   ```

### 4A-2. Start the databases

```bash
# From project root
docker compose up -d
```

This starts 3 containers:
- `twon_postgres` — PostgreSQL on port 5432
- `twon_mongodb` — MongoDB on port 27017
- `twon_redis` — Redis on port 6379

### 4A-3. Verify all containers are healthy

```bash
docker compose ps
```

Expected output — all 3 should say `healthy`:
```
NAME             STATUS
twon_postgres    running (healthy)
twon_mongodb     running (healthy)
twon_redis       running (healthy)
```

> If any says `starting` — wait 10–15 seconds and run `docker compose ps` again.
> If any says `unhealthy` — run `docker compose logs postgres` (or mongodb/redis) to see the error.

### 4A-4. Set database URLs in `.env`

```env
DATABASE_URL=postgresql://twon:twon_dev@localhost:5432/twon_db
MONGODB_URI=mongodb://twon:twon_dev@localhost:27017/twon?authSource=admin
REDIS_URL=redis://localhost:6379
```

### Docker daily usage

```bash
# Start databases (run this every time you open the project)
docker compose up -d

# Stop databases (when done for the day — data is preserved)
docker compose down

# View logs if something looks wrong
docker compose logs postgres
docker compose logs mongodb
docker compose logs redis

# Wipe all data and start completely fresh (destructive!)
docker compose down -v
docker compose up -d
```

---

## Step 4B — Use cloud databases instead (no Docker)

> Use this if Docker is not available. See full guide: `docs/technical/cloud-databases-setup.md`

| Service | Sign up | What to copy |
|---|---|---|
| **Neon** (PostgreSQL) | https://neon.tech | Project → Connection string |
| **MongoDB Atlas** (MongoDB) | https://mongodb.com/atlas | Cluster → Connect → Drivers |
| **Upstash** (Redis) | https://upstash.com | Database → Connect → Redis URL |

Then set in `apps/api/.env`:
```env
DATABASE_URL=postgresql://...     ← from Neon
MONGODB_URI=mongodb+srv://...     ← from Atlas
REDIS_URL=redis://...             ← from Upstash
```

---

## Step 5 — Run database migrations

```bash
cd apps/api

# Generate Prisma client types
npx prisma generate

# Create all tables (run once on first setup)
npx prisma migrate dev --name init

cd ../..
```

---

## Step 6 — Frontend one-time fix

```bash
# Remove duplicate route file (causes build error if left)
cd apps/web
rm src/app/\(main\)/page.tsx
cd ../..
```

---

## Step 7 — Start both apps

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd apps/api
npm run start:dev
# Running at http://localhost:3001/api
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
npm run dev
# Running at http://localhost:3000
```

---

## Step 8 — Verify everything works

Open http://localhost:3000 — you should see the Twon catalog page.

Test the backend:
```bash
curl http://localhost:3001/api/catalog/products
# Should return: { code: "A001", status: "success", data: [] }
```

---

## Step 9 — Create first admin account

1. Register at http://localhost:3000/auth/register
2. Check the **backend terminal** for the OTP (printed there in dev mode)
3. Enter the OTP at http://localhost:3000/auth/verify
4. Manually promote your user to ADMIN in Prisma Studio:

```bash
cd apps/api
npx prisma studio
# Opens at http://localhost:5555
# → User table → find your email → change role to ADMIN → Save
```

---

## Step 10 — Set up payment config (first admin task)

1. Log in as admin → go to http://localhost:3000/admin/config
2. Enter bank name, account name, account number
3. Upload your PromptPay QR image
4. Now customers will see this at checkout

---

## All URLs at a glance

| What | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Prisma Studio (DB browser) | http://localhost:5555 |
| PostgreSQL | localhost:5432 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |

---

## If something breaks

```bash
# Backend won't start — check .env has all required values
# Missing DATABASE_URL / MONGODB_URI / REDIS_URL / JWT_SECRET are the most common

# "Cannot connect to database" — make sure Docker is running OR cloud URLs are correct

# Frontend blank page — open browser DevTools → Console for errors

# Nuclear reset (wipe all and start over)
docker compose down -v          # wipe Docker DB data
npx prisma migrate reset        # wipe + re-migrate (run from apps/api)
```
