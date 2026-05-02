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

# Generate Prisma client (uses schema.prisma — no DB needed here)
RUN npx prisma generate

# Build Next.js in standalone mode (produces .next/standalone/)
RUN npm run build


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

# Prisma schema (needed by `prisma migrate deploy`)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma CLI + generated client (kept minimal)
COPY --from=builder /app/node_modules/.bin/prisma        ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma             ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma            ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Run pending migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
