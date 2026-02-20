# ============================================
# Cricket Club Website - Production Dockerfile
# Multi-stage build: Frontend + Backend
# ============================================

# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Production Server ---
FROM node:20-alpine AS production
WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Install server dependencies only
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci --production && npm cache clean --force

# Copy server code
COPY server/*.js ./

# Copy frontend build output
WORKDIR /app
COPY --from=frontend-build /app/dist ./dist

# Add static file serving to the Express server
# The server will serve the built frontend from /app/dist

# Environment variables (override at runtime)
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server
CMD ["node", "server/index-simple.js"]
