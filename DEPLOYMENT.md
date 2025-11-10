# FlagKit Deployment Guide

This guide covers deploying FlagKit to production environments.

## Overview

FlagKit consists of three main components:
1. **PostgreSQL Database** - Data persistence
2. **API Server** (Fastify) - Backend API and SDK endpoints
3. **Web Dashboard** (Next.js) - Management interface

## Prerequisites

- PostgreSQL 14+ database (hosted or self-hosted)
- Node.js 20+ runtime environment
- Domain names (optional but recommended):
  - `api.yourdomain.com` for API
  - `app.yourdomain.com` for dashboard

## Deployment Options

### Option 1: Railway (Recommended for Quick Start)

Railway provides an easy deployment experience with built-in PostgreSQL.

#### 1. Database Setup

```bash
# Create new PostgreSQL database on Railway
# Copy the DATABASE_URL from Railway dashboard
```

#### 2. Deploy API Server

Create `railway.json` in `apps/api/`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Environment variables for API:
```env
DATABASE_URL=postgresql://user:password@host:5432/flagkit
JWT_SECRET=your-very-secure-secret-key-min-32-chars
PORT=3001
NODE_ENV=production
```

```bash
# Connect Railway to your GitHub repo
# Railway will auto-deploy on push to main
```

#### 3. Deploy Web Dashboard

Environment variables for Web:
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
```

Deploy via Railway or Vercel (see Option 2).

### Option 2: Vercel (Frontend) + Railway/Render (Backend)

#### 1. Deploy API to Railway/Render

**Railway:**
- Connect GitHub repository
- Select `apps/api` as root directory
- Add environment variables (see above)
- Deploy

**Render:**
Create `render.yaml`:

```yaml
services:
  - type: web
    name: flagkit-api
    env: node
    region: oregon
    plan: starter
    buildCommand: cd apps/api && pnpm install && pnpm prisma generate
    startCommand: cd apps/api && pnpm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

#### 2. Deploy Web to Vercel

```bash
cd apps/web

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL
# Enter your API URL: https://your-api.railway.app
```

Or use Vercel dashboard:
- Import Git repository
- Set root directory to `apps/web`
- Add environment variable: `NEXT_PUBLIC_API_URL`
- Deploy

### Option 3: Self-Hosted (Docker)

#### 1. Build Docker Images

Create `Dockerfile` in `apps/api/`:

```dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config ./packages/config
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Build
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

Create `Dockerfile` in `apps/web/`:

```dockerfile
FROM node:20-alpine AS base

RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/web
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: flagkit
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: flagkit
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://flagkit:${DB_PASSWORD}@db:5432/flagkit
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - db
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    ports:
      - "3000:3000"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

Create `.env` file:
```env
DB_PASSWORD=your-secure-database-password
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
```

Run:
```bash
docker-compose up -d
```

## Database Migrations

### Production Migration Strategy

**Initial Setup:**
```bash
cd apps/api

# Run migrations
pnpm prisma migrate deploy

# Seed initial data (optional)
pnpm prisma db seed
```

**For Updates:**
```bash
# Create migration locally
pnpm prisma migrate dev --name description_of_change

# Commit migration files to git
git add prisma/migrations
git commit -m "Add migration: description_of_change"

# Deploy to production
pnpm prisma migrate deploy
```

### Zero-Downtime Migrations

For production systems:

1. **Backwards-compatible changes first:**
   - Add new columns as nullable
   - Keep old columns during transition

2. **Deploy application with dual-write:**
   - Write to both old and new columns

3. **Backfill data:**
   - Migrate existing data to new format

4. **Deploy application using new columns:**
   - Read from new columns only

5. **Remove old columns:**
   - Drop deprecated columns in final migration

## Environment Variables Reference

### API Server (apps/api)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) | `your-secure-secret-here` |
| `PORT` | No | Server port | `3001` (default) |
| `NODE_ENV` | Yes | Environment | `production` |
| `CORS_ORIGIN` | No | Allowed CORS origins | `https://app.yourdomain.com` |

### Web Dashboard (apps/web)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | API base URL | `https://api.yourdomain.com` |

## Security Checklist

### Before Production

- [ ] Set strong `JWT_SECRET` (minimum 32 characters, random)
- [ ] Use HTTPS for all endpoints (API and Web)
- [ ] Enable CORS only for your frontend domain
- [ ] Set secure database password
- [ ] Restrict database access to API server only
- [ ] Review Prisma schema for sensitive fields
- [ ] Set up database backups
- [ ] Configure rate limiting on API endpoints
- [ ] Review and limit API access logs
- [ ] Set up monitoring and alerts

### Recommended Security Headers

Add to API server in production:

```typescript
// apps/api/src/index.ts
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});
```

## Monitoring

### Health Checks

API health endpoint:
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### Recommended Monitoring

- **Application Performance Monitoring (APM):**
  - Sentry for error tracking
  - DataDog or New Relic for performance

- **Infrastructure Monitoring:**
  - Railway/Render built-in metrics
  - CloudWatch for AWS deployments

- **Database Monitoring:**
  - Connection pool metrics
  - Query performance
  - Slow query logs

## Scaling Considerations

### Vertical Scaling
Start with a single API server and scale vertically:
- Increase CPU/RAM as needed
- Most workloads fit on 1-2 vCPU with 2GB RAM

### Horizontal Scaling
When you need multiple API servers:

1. **Session Management:**
   - JWTs are stateless, no session storage needed

2. **Database Connection Pooling:**
   - Use connection pooler (PgBouncer)
   - Limit connections per API instance

3. **Load Balancing:**
   - Use Railway/Render built-in load balancing
   - Or nginx/Traefik for self-hosted

### Database Scaling

- **Read Replicas:** For high read workload
- **Connection Pooling:** PgBouncer or Prisma connection pooling
- **Caching:** Redis for frequently accessed flags (future enhancement)

## Backup and Disaster Recovery

### Database Backups

**Automated (Managed Services):**
- Railway: Automatic daily backups
- Render: Available on paid plans
- Neon/Supabase: Point-in-time recovery

**Self-Hosted:**
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3/storage
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-bucket/backups/
```

### Backup Schedule Recommendation
- **Daily:** Full database backup (retain 7 days)
- **Weekly:** Full backup (retain 4 weeks)
- **Monthly:** Full backup (retain 12 months)

### Recovery Testing
Test restore process monthly:
```bash
# Restore to test database
psql $TEST_DATABASE_URL < backup-20240101.sql

# Verify data integrity
pnpm prisma db pull
```

## Troubleshooting

### API Server Not Starting

1. Check environment variables are set
2. Verify database connection: `pnpm prisma db pull`
3. Check logs for error messages
4. Ensure migrations are up to date: `pnpm prisma migrate deploy`

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# In Prisma schema, adjust connection limits:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 10
}
```

### Web Dashboard Can't Connect to API

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check CORS settings on API
3. Ensure API is accessible from browser (not firewall-blocked)
4. Check browser console for specific errors

### Migration Failures

```bash
# Reset to last successful migration
pnpm prisma migrate resolve --rolled-back migration_name

# Mark migration as applied (if manually fixed)
pnpm prisma migrate resolve --applied migration_name

# For dev: Reset and start fresh (DESTRUCTIVE)
pnpm prisma migrate reset
```

## Performance Optimization

### API Server
- Enable Fastify compression: `fastify.register(compress)`
- Configure connection pooling in Prisma
- Add indexes for frequently queried fields
- Use CDN for static assets

### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_flags_project_id ON "Flag"(project_id);
CREATE INDEX idx_environments_project_id ON "Environment"(project_id);
CREATE INDEX idx_flag_env_config ON "FlagEnvironmentConfig"(flag_id, environment_id);
```

### Web Dashboard
- Enable Next.js output caching
- Use CDN for static assets (Vercel automatically handles this)
- Implement code splitting for large pages

## Support

For deployment issues:
1. Check this deployment guide
2. Review application logs
3. Open an issue on GitHub
4. Check Railway/Render/Vercel documentation

---

Last updated: 2024
