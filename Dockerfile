# ─────────────────────────────────────────────────────────────
# Stage 1: install ALL dependencies (including devDeps for build)
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci


# ─────────────────────────────────────────────────────────────
# Stage 2: build the Next.js app + generate Prisma client
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client — DATABASE_URL fictícia apenas para satisfazer o Prisma 7 no build
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

# Build Next.js em modo standalone — mesma variável fictícia para evitar erros do Prisma
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build


# ─────────────────────────────────────────────────────────────
# Stage 3: lean production image
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Prisma schema + config (necessários para `prisma migrate deploy`)
COPY --from=builder --chown=nextjs:nodejs /app/prisma         ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# node_modules completo para o Prisma CLI conseguir rodar `migrate deploy`
# (O runtime do Next.js usa o standalone e não depende disto)
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

# Aguarda o banco aceitar conexões, roda as migrations e inicia o servidor
CMD ["sh", "-c", "until node_modules/.bin/prisma migrate deploy; do echo 'DB not ready, retrying in 3s...'; sleep 3; done && node server.js"]
