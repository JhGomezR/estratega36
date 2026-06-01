# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js 14 app (standalone output).
# Build:  docker build -t estratega360 .
# Run:    docker run -p 3000:3000 --env-file .env estratega360
#
# Required runtime environment (provide via --env-file / orchestrator secrets):
#   - GEMINI_API_KEY                 (Genkit / Google AI)
#   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
#   - GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY
#     (Firebase Admin SDK; on GCP it uses Application Default Credentials)
# NOTE: NEXT_PUBLIC_* values are baked at BUILD time. Pass them as build args
#       if they must differ per environment (see ARG/ENV below).

# ---------- deps: install all dependencies (incl. dev, needed to build) ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder: produce the standalone server ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Public build-time vars (override with --build-arg if needed)
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN npm run build

# ---------- runner: minimal production image ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# server.js is emitted by Next's standalone output.
CMD ["node", "server.js"]
