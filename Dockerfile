# syntax=docker/dockerfile:1
# Imagen de producción para Estratega 360 (Next.js 14, salida standalone).
# Build multi-stage → imagen final mínima y sin root.

# ---------- 1) Dependencias ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Variable pública (se hornea en build). Llega como build-arg desde el compose.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN npm run build

# ---------- 3) Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Artefactos de la salida standalone de Next.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Reglas de Firestore: provisionTenant() las lee en runtime desde process.cwd()
# (/app) para desplegarlas a la DB del tenant. La salida standalone NO las
# incluye, así que hay que copiarlas explícitamente (si no: ENOENT).
COPY --from=builder --chown=nextjs:nodejs /app/firestore.tenant.rules ./firestore.tenant.rules
COPY --from=builder --chown=nextjs:nodejs /app/firestore.control-plane.rules ./firestore.control-plane.rules

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
