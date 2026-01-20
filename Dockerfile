# ============================================
# FUCKOMETER API - DOCKERFILE
# ============================================

# Stage 1: Build
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json turbo.json ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build shared and api packages
RUN pnpm --filter @fuckometer/shared build
RUN pnpm --filter @fuckometer/api build

# Stage 2: Production
FROM node:20-slim AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Create data directory for SQLite
RUN mkdir -p /app/packages/api/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run the API
WORKDIR /app/packages/api
CMD ["node", "dist/index.js"]
