# Multi-stage Dockerfile for MCP Config Manager v2
# Production-ready with security hardening and optimization

# Stage 1: Build environment
FROM node:18-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with exact versions for security
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY jest.config.ts ./
COPY webpack.*.ts ./
COPY type-coverage.json ./

# Install dev dependencies needed for build
RUN npm ci --no-audit --no-fund

# Build the application
RUN npm run build && \
    npm run typecheck && \
    npm prune --production

# Stage 2: Production environment
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=mcpuser:mcpuser /app/dist ./dist
COPY --from=builder --chown=mcpuser:mcpuser /app/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:mcpuser /app/package.json ./package.json

# Create directories for configuration and logs
RUN mkdir -p /app/config /app/logs /app/data && \
    chown -R mcpuser:mcpuser /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Security: Switch to non-root user
USER mcpuser

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024" \
    CONFIG_PATH=/app/config \
    LOG_PATH=/app/logs \
    DATA_PATH=/app/data

# Use dumb-init to handle signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# Metadata
LABEL maintainer="Claude Code <claude@anthropic.com>" \
      version="2.0.0" \
      description="MCP Config Manager v2 - Advanced configuration manager for Model Context Protocol servers" \
      org.opencontainers.image.title="MCP Config Manager v2" \
      org.opencontainers.image.description="Advanced configuration manager for Model Context Protocol servers" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.authors="Claude Code" \
      org.opencontainers.image.vendor="Anthropic" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.url="https://github.com/claude-code/mcp-config-manager-v2" \
      org.opencontainers.image.source="https://github.com/claude-code/mcp-config-manager-v2" \
      org.opencontainers.image.documentation="https://claude-code.github.io/mcp-config-manager-v2/"