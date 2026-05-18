# Render Deployment Configuration Guide

## Summary of Changes
This backend is configured for production deployment on **Render** with **Neon PostgreSQL** and **Render Redis**. The following fixes have been applied:

### ✅ Applied Fixes
1. **Global Error Handlers** (`server.ts`)
   - Added `uncaughtException` handler to prevent silent crashes
   - Added `unhandledRejection` handler to catch promise rejections
   - Process exits immediately on uncaught exceptions (prevents zombie processes)

2. **Port Binding** (`server.ts`)
   - Changed: `app.listen(PORT, async () => {...})`
   - To: `app.listen(PORT, '0.0.0.0', async () => {...})`
   - **Required for Render** to correctly bind to the assigned port

3. **Prisma Migrations** (`package.json`)
   - Added `migrate:deploy` script: `prisma migrate deploy`
   - Updated `start` script: `npm run migrate:deploy && node dist/server.js`
   - **Ensures** migrations run automatically on every Render deployment

4. **Health Check Endpoint** (`app.ts`)
   - Added `GET /health` endpoint
   - Returns `{ status: 'ok', timestamp: ... }`
   - **Render uses this** to detect when app is ready (prevents premature scale-up)

5. **Redis Connection Improvements** (`redis.ts`)
   - Added `enableOfflineQueue: true` to queue commands during reconnects
   - Maintains connection stability during Redis service restarts

---

## Render Environment Setup

### Step 1: Create GitHub Secret
Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

**⚠️ CRITICAL:** Reset your Neon and Upstash passwords BEFORE creating these secrets:
1. Go to **Neon Console** → Your Project → **Settings → Reset Password**
2. Go to **Upstash Console** → Your Redis → **Reset Password**
3. Copy the NEW URLs with new passwords

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://user:NEW_PASSWORD@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require` |
| `DIRECT_URL` | `postgresql://user:NEW_PASSWORD@ep-xxx.region.aws.neon.tech/dbname?sslmode=require` |
| `REDIS_URL` | `redis://red-xxx:6379` (Render internal) OR `rediss://default:NEW_PASSWORD@upstash-url:6380` |
| `JWT_SECRET` | *(generate 32+ char random string)* |
| `REFRESH_SECRET` | *(generate 32+ char random string)* |
| `FRONTEND_URL` | Your Vercel deployment URL |
| `CORS_ORIGIN` | Your Vercel deployment URL |

**Note:** `DATABASE_URL` uses `-pooler` (connection pooling for runtime), `DIRECT_URL` is direct connection (for migrations only)

### Step 2: GitHub Actions Workflow
The workflow (`.github/workflows/backend.yml`) now:
- References `${{ secrets.REDIS_URL }}` in build and deploy jobs
- Runs tests against local Redis
- Deploys to Render with production secrets

### Step 3: Render Service Configuration
**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```
*(This now includes Prisma migrations automatically)*

**Environment Variables:**
- Add all secrets from GitHub Actions
- Render will use the **primary domain** for networking

### Step 4: Database Migrations with Neon Connection Pooling
Neon requires connection pooling at runtime (via PgBouncer) and direct connections for migrations. Your `schema.prisma` now has:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // pooler URL — runtime
  directUrl = env("DIRECT_URL")       // direct URL — migrations
}
```

This means:
- ✅ Runtime queries use pooler (handles 100+ connections efficiently)
- ✅ `prisma migrate deploy` uses direct connection (required for schema changes)
- ✅ First deployment creates schema automatically
- ✅ Subsequent deployments apply only new migrations

---

## Render Free Tier Considerations

### Automatic Scale-Down After 15 Minutes Inactivity
- First request after idle: ~30s response time (service wakes up)
- Subsequent requests: Normal speed
- **Mitigation:** Configure monitor or cron job to ping `/health` every 10 minutes

### No Persistent Storage
- Data persists only in **PostgreSQL** (Neon)
- Data persists only in **Redis** (Render Redis)
- Don't store files locally; use S3 or similar

### Shared Database Resources
- PostgreSQL (Neon free tier) has connection limits
- Redis (Render free tier) has memory limits (~100MB)
- Monitor usage in Render and Neon dashboards

---

## Verification Checklist

Before deploying to Render:

- [ ] **PASSWORDS RESET** at Neon Console and Upstash Console (critical security)
- [ ] GitHub secret `REDIS_URL` created with your Render Redis URL
- [ ] GitHub secret `DATABASE_URL` created with Neon `-pooler` URL
- [ ] GitHub secret `DIRECT_URL` created with Neon direct (no `-pooler`) URL
- [ ] `schema.prisma` has both `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`
- [ ] `JWT_SECRET` and `REFRESH_SECRET` are random 32+ character strings
- [ ] `FRONTEND_URL` and `CORS_ORIGIN` point to your Vercel deployment
- [ ] `.github/workflows/backend.yml` references all required secrets
- [ ] `package.json` start script includes `npm run migrate:deploy`
- [ ] `server.ts` binds to `0.0.0.0` (not localhost)
- [ ] Global error handlers are in place in `server.ts`
- [ ] `/health` endpoint returns `200 OK`
- [ ] Local tests pass: `npm test`
- [ ] TypeScript compiles without errors: `npm run build`

---

## Troubleshooting

### Silent Failures on Render
If your Render deployment shows "Your service is running" but requests fail:

1. **Check logs:** Render dashboard → Logs
   - Look for "UNCAUGHT EXCEPTION" messages
   - Look for `MODULE_NOT_FOUND` errors

2. **Verify migrations:** Check if Prisma migration failed
   - Run locally: `npm run prisma:migrate dev`
   - Ensure migrations in `prisma/migrations/` are committed

3. **Check Redis connectivity:** BullMQ workers need Redis
   - Verify `REDIS_URL` is set correctly
   - Verify it uses `redis://` (not `rediss://`) for Render internal
   - Check Redis service is running in Render dashboard

4. **Verify port binding:** Render must see service listening on `0.0.0.0`
   - Confirm `server.ts` has: `app.listen(PORT, '0.0.0.0', async () => { ... })`
   - Don't use `localhost` for binding

5. **Check health endpoint:**
   ```bash
   curl https://your-render-url.onrender.com/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

---

## Deployment Process

1. Commit and push changes to GitHub
2. GitHub Actions workflow triggers automatically
3. Workflow builds and runs tests
4. On success, deploys to Render
5. Render runs build command (compiles TypeScript)
6. Render runs start command (migrations + server startup)
7. Health check endpoint becomes available
8. Service scales up to handle traffic

Total time: ~2-3 minutes

---

## References

- [Render Node.js Deployment](https://render.com/docs/deploy-node-express-app)
- [Render Redis Documentation](https://render.com/docs/redis)
- [Neon PostgreSQL Documentation](https://neon.tech/docs)
- [BullMQ Redis Connection Guide](https://docs.bullmq.io/guide/connections)
- [Prisma on Vercel/Render](https://www.prisma.io/docs/deployment/deployment-guides/deploying-to-render)
