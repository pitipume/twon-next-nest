FROM node:20-alpine
WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install all deps (dev included — needed for nest CLI + TypeScript)
RUN npm install --include=dev

# Copy API source
COPY apps/api ./apps/api

# Generate Prisma client + compile
RUN cd apps/api && npx prisma generate && npm run build

# Verify dist was created (fails build visibly if nest build produced nothing)
RUN ls /app/apps/api/dist/main.js

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/main"]
