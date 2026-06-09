# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests (workspace root + api)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install all deps including dev tools (nest CLI, typescript, etc.)
RUN npm install --include=dev

# Copy API source
COPY apps/api ./apps/api

# Generate Prisma client + compile TypeScript
RUN cd apps/api && npx prisma generate && npm run build

# ---- Stage 2: Run ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests + install prod deps only
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --omit=dev

# Copy generated Prisma client (schema-specific, built in stage 1)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled app
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema (needed for db push at startup)
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma

EXPOSE 3000

# --datasource-url bypasses prisma.config.ts (no ts-node needed in runtime)
CMD ["sh", "-c", "cd apps/api && npx prisma db push --schema=prisma/schema.prisma --datasource-url=${DATABASE_URL} --accept-data-loss && node dist/main"]
