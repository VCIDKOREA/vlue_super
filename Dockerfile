# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base

# System dependencies: Korean fonts for Sharp SVG rendering, OpenSSL for Prisma, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-nanum \
    fontconfig \
    openssl \
    ca-certificates \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Stage 1: Build packages and API
FROM base AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma ./packages/db/prisma/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install workspace dependencies (includes prisma generate via postinstall)
RUN npm ci

# Copy sources and build configs
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY scripts ./scripts
COPY src ./src

# Build db, shared, and api
RUN npm run build -w @vlue/db && \
    npm run build -w @vlue/shared && \
    npm run build -w @vlue/api

# Stage 2: Runtime image
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8788

# Copy built workspace and node_modules
COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

EXPOSE 8788

CMD ["npm", "run", "start", "-w", "@vlue/api"]
