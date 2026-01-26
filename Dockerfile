# Dockerfile for Babulus Render Worker (ECS/Fargate)
#
# This container runs video rendering jobs on AWS Fargate.
# It includes Node.js, Playwright (Chromium), and ffmpeg for video encoding.

FROM node:20-bullseye-slim

# Install system dependencies for Playwright and ffmpeg
RUN apt-get update && apt-get install -y \
    # Playwright/Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    # ffmpeg for video encoding
    ffmpeg \
    # Build tools (may be needed for native modules)
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package.json package-lock.json ./
COPY packages/renderer/package.json ./packages/renderer/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (production only)
RUN npm ci --omit=dev

# Install Playwright browsers (Chromium only)
RUN npx playwright install chromium --with-deps

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Create working directory for renders
RUN mkdir -p /app/.babulus/worker

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Health check (optional - checks if Node.js can start)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Entrypoint: Run ECS worker (processes one job and exits)
CMD ["node", "dist/worker-ecs.js"]
