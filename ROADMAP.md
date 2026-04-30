# InDaZone Roadmap

Comprehensive roadmap, architecture, and implementation plan for the GPS-based attendance platform.

## Product Goals

- Allow check-in/check-out only inside a geofence (default: 100m radius).
- Mark attendance as valid only if on-premise duration is at least 6 hours.
- Prevent proxy attendance through multi-signal validation.
- Provide auditable, reliable attendance records for students and admins.

## Tech Stack

- Mobile app (student): React Native or Flutter.
- Web dashboard (admin): Next.js + React, with `@react-google-maps/api` for map rendering.
- Backend: Node.js + Express (or NestJS for larger teams).
- Alternative backend: Python + FastAPI.
- Database: PostgreSQL for attendance and user data.
- Cache: Redis for active sessions and geofence metadata.
- Location input: Device Geolocation API.
- Map visualization: Google Maps JavaScript API (or Static Maps API).
- Push notifications: FCM (Android), APNs (iOS).
- Auth: JWT access tokens + refresh token rotation, with role-based authorization.

## Architecture Notes

- Geofence validation must run server-side (never trust client-only checks).
- Use Redis to avoid database hits for every location ping.
- Keep attendance writes idempotent and enforce daily uniqueness at the DB layer.
- Treat location as one signal among several (time, device, behavior).

## Attendance Flow (ASCII)

```text
================================================================================
|                               CLIENT LAYER                                   |
|                                                                              |
|  +---------------------------+    +--------------------------+               |
|  |  Student Mobile App       |    |  Admin Dashboard         |               |
|  |  (React Native / Flutter) |    |  (Next.js / React)       |               |
|  |                           |    |                          |               |
|  |  - GPS capture            |    |  - View attendance logs  |               |
|  |  - Map display            |    |  - Manage premises       |               |
|  |  - Check-in / check-out   |    |  - Export reports        |               |
|  +---------------------------+    +--------------------------+               |
|              | HTTPS / API                    | HTTPS / API                  |
================================================================================
                  |
                  v
================================================================================
|                               BACKEND LAYER                                  |
|                                                                              |
|  +-----------------------------------------------------------------------+   |
|  |                         API Gateway / Auth                            |   |
|  |                    JWT Auth + Rate Limiting + RBAC                    |   |
|  +-----------------------------------------------------------------------+   |
|                    |                              |                          |
|                    v                              v                          |
|  +---------------------------+   +---------------------------+               |
|  |  Geofence Service         |   |  Attendance Service       |               |
|  |  Haversine / 100m radius  |   |  POST /check-in           |               |
|  |  Redis cache lookup       |   |  POST /check-out          |               |
|  |  Returns within / outside |   |  PRESENT / ABSENT logic   |               |
|  +---------------------------+   +---------------------------+               |
|                    |                              |                          |
|                    v                              v                          |
|  +---------------------------+   +---------------------------+               |
|  |  Notification Service     |   |  Fraud / Async Worker     |               |
|  |  FCM / APNs               |   |  Risk scoring             |               |
|  |  Push reminders           |   |  Impossible velocity      |               |
|  +---------------------------+   +---------------------------+               |
|                                                                              |
|                         +---------------------------+                        |
|                         |  BullMQ / Redis Queue     |                        |
|                         |  retry / delay / cron     |                        |
|                         +---------------------------+                        |
================================================================================
                  |
                  v
================================================================================
|                        DATA & EXTERNAL SERVICES                              |
|                                                                              |
|  +--------------------+   +--------------------+   +----------------------+  |
|  | PostgreSQL         |   | Redis              |   | Google Maps API      |  |
|  |                    |   |                    |   |                      |  |
|  | users              |   | active_sessions    |   | geocoding / map UI   |  |
|  | premises           |   | geofence_cache     |   | admin dashboard maps |  |
|  | attendance_logs    |   | rate_limits        |   |                      |  |
|  | sessions           |   | revoked_tokens     |   |                      |  |
|  +--------------------+   +--------------------+   +----------------------+  |
================================================================================

CHECK-IN FLOW

Student taps check-in
  |
  v
Device captures GPS coordinates { lat, lng, timestamp }
  |
  v
POST /check-in { student_id, lat, lng, timestamp }
  |
  v
Server-side geofence check
  |
  +--> YES --> Log check_in_time
  |              Store in PostgreSQL
  |              Return 200 OK
  |
  +--> NO  --> Return 403 Forbidden
         "Outside geofence"

CHECK-OUT FLOW

Student taps check-out
  |
  v
POST /check-out { student_id, lat, lng, timestamp }
  |
  v
Server verifies check-in exists
  |
  v
Compute duration = check_out_time - check_in_time
  |
  +--> duration >= 6 HOURS --> attendance = PRESENT
  |                           Write to PostgreSQL
  |
  +--> duration < 6 HOURS  --> attendance = ABSENT
                Write to PostgreSQL

DATABASE SCHEMA (simplified)

users                       premises                    attendance_logs
-----                       --------                    ---------------
id (PK)                     id (PK)                    id (PK)
name                        name                       student_id (FK -> users)
email                       latitude                   premise_id (FK -> premises)
role                        longitude                  check_in_time
password_hash               radius_meters              check_out_time
created_at                  created_at                 duration_hours
              updated_at                 status [PRESENT | ABSENT | PENDING]
                             date
                             created_at
```

## Delivery Plan (16 Weeks)

### Phase 1 - Foundation (Weeks 1-3)

- Monorepo setup and CI/CD pipeline.
- Auth flow: JWT access + refresh rotation, RBAC middleware.
- Core schema: users, premises, attendance_logs, sessions.
- Database migrations tooling (Prisma Migrate or Flyway). [New]
- Environment separation: dev, staging, prod. [New]
- API versioning strategy (/v1/...). [New]
- Structured logging setup (Pino) with audit fields from day one. [New]

### Phase 2 - Core Geofencing + Rate Limiting (Weeks 4-6)

- Geofence service: server-side Haversine, 100m radius enforcement.
- POST /check-in and POST /check-out endpoints.
- Redis cache for premises config (cache-aside, TTL 10 minutes).
- Rate limiting on attendance endpoints (token bucket, 3 requests/min per student). [Moved Earlier]
- Signed timestamp on check-in requests; reject if older than 30 seconds (replay protection). [New]
- Fallback to Postgres geofence lookup when Redis is unavailable. [New]

### Phase 3 - Attendance Validation + Async Queue (Weeks 7-8)

- Persist check_in_time and check_out_time, apply 6-hour minimum rule.
- Unique DB constraint on (student_id, date), not only app-level checks.
- Midnight crossover handling and auto-close for unclosed sessions.
- BullMQ queue setup on Redis. [New]
- Emit location.ping events and run fraud checks asynchronously. [New]
- Nightly cron sweep for unclosed sessions. [New]

### Phase 4 - Mobile App (Weeks 8-11)

- Student app UI, auth flow, and role-based screens.
- Foreground and optional background location permissions.
- Live map with geofence circle and distance-to-boundary.
- Check-in and check-out API integration.
- Today's attendance status and history view.
- Push notification handling (FCM and APNs).
- Circuit breaker: show cached status when API is unreachable. [New]

### Phase 5 - Admin Dashboard (Weeks 12-14)

- Premises registration and management (lat/lng/radius).
- Attendance views by student, class, and date.
- CSV export.
- Analytics: attendance rate, frequent absentees, late arrivals.
- Read replica for admin queries to offload primary DB. [New]
- WebSocket or SSE for real-time attendance updates. [New]
- Audit log view with full status change history. [New]

### Phase 6 - Hardening and Launch (Weeks 15-16)

- Fraud worker: impossible velocity, altitude anomaly, device fingerprint mismatch.
- SSL pinning in mobile clients.
- GDPR-aligned retention and deletion policies.
- Load testing and staged rollout.
- Postgres attendance_logs table partitioning by month. [New]
- Backup and point-in-time recovery strategy for Postgres. [New]
- Prometheus metrics: check-in latency, geofence rejection rate, active sessions. [New]
- Alerting on error spikes and queue backlog. [New]

## System Architecture (Layered)

### 1. Client Layer

- Mobile App (React Native or Flutter): device GPS, UX-side pre-check, signed timestamp on check-in, SSL pinning, optional background location.
- Admin Dashboard (Next.js): premises management, attendance views, CSV exports, analytics, real-time updates.

### 2. Edge / Gateway Layer

- CDN (for web static assets): edge caching and DDoS protection.
- L7 Load Balancer: routes requests to stateless API workers; sticky sessions not required.
- Rate Limiter (Redis token bucket): per-student and per-IP throttle before business logic.

### 3. Application Layer (Stateless Workers)

- Auth Service: JWT access tokens (15 min), refresh rotation, RBAC.
- Geofence Service: server-side Haversine, Redis cache-aside with Postgres fallback.
- Attendance Service: idempotent check-in/out, unique(student_id, date), event emission to queue.
- Notification Service: FCM/APNs delivery with retries and dead-letter handling.

### 4. Async Layer

- Job Queue (BullMQ on Redis): location.ping and notification.send events.
- Fraud Worker: velocity, altitude, and device mismatch checks with risk scoring.
- Scheduled Jobs: nightly auto-close sweep for unclosed sessions.

### 5. Data Layer

- PostgreSQL: source of truth for users, premises, sessions, and attendance logs.
- Redis: cache and operational state (rate limits, active sessions, queues, revoked tokens).

## Gaps and Additions Applied

- Rate limiting moved to Phase 2 because it is a core anti-fraud control.
- Replay attack prevention added via signed timestamp and 30-second acceptance window.
- API versioning enforced from day one (/v1) to support backward compatibility.
- Observability added early: structured logs with audit fields for every check-in decision.
- Async fraud checks added via queue so p99 check-in latency stays low.
- Real-time admin updates added through WebSocket/SSE (polling as fallback).
- DB migration tooling included from Phase 1 to avoid manual production SQL changes.
- Read replica strategy added for heavy dashboard reads.
- Postgres partitioning and backup/PITR strategy added for long-term reliability.

## Core Server-Side Logic

```javascript
function isWithinGeofence(studentLat, studentLng, premiseLat, premiseLng, radiusMeters) {
  const R = 6371000; // Earth radius in meters

  const phi1 = (studentLat * Math.PI) / 180;
  const phi2 = (premiseLat * Math.PI) / 180;
  const deltaPhi = ((premiseLat - studentLat) * Math.PI) / 180;
  const deltaLambda = ((premiseLng - studentLng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusMeters;
}

function markAttendance(checkIn, checkOut) {
  const hours = (checkOut - checkIn) / 3600000;
  return hours >= 6 ? "PRESENT" : "ABSENT";
}
```

## Anti-Proxy and Fraud Controls

- Timestamp sanity checks: reject future timestamps and stale events older than 5 minutes.
- Impossible travel velocity detection across consecutive pings.
- Device binding or fingerprinting to reduce account sharing.
- Risk scoring to combine location, device, and behavior signals.

## Minimum Launch Criteria

- Stable check-in/check-out under expected peak load.
- End-to-end audit trail for attendance status changes.
- Admin exports and analytics available.
- Security controls (rate limits, token rotation, basic spoof detection) active.