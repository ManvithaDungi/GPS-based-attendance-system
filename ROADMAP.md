# InDaZone

Enterprise-grade GPS and geofencing-based attendance management platform built for secure, auditable, and real-time attendance tracking.

InDaZone combines a React Native mobile application for students, a React web-based admin dashboard, and a Node.js backend with PostgreSQL and Redis to deliver reliable location-verified attendance workflows.

---

# Table of Contents

1. Overview
2. Core Features
3. System Architecture
4. Technology Stack
5. Monorepo Structure
6. Authentication and Security
7. Attendance Workflow
8. Backend Services
9. API Overview
10. Mobile Application
11. Web Admin Dashboard
12. Database Design
13. Redis and Queue Architecture
14. Fraud Prevention and Validation
15. Environment Configuration
16. Local Development Setup
17. Deployment Strategy
18. Observability and Monitoring
19. Roadmap
20. Future Enhancements

---

# Overview

InDaZone is designed to solve proxy attendance, unreliable location validation, and poor auditability in traditional attendance systems.

The platform enforces:

* Server-side geofence validation
* GPS accuracy verification
* Replay attack prevention
* Device-bound authentication sessions
* Minimum attendance duration rules
* Fraud and anomaly detection
* Real-time attendance monitoring
* Role-based administrative control

The system architecture is built around scalability, security, operational reliability, and production-grade attendance auditing.

---

# Core Features

## Student Features

* GPS-based check-in and check-out
* Live geofence validation
* Real-time attendance status
* Attendance history and summaries
* Push notifications
* Secure JWT authentication
* Device-bound sessions
* Low GPS accuracy rejection
* Geofence boundary distance display

## Admin Features

* Attendance monitoring dashboard
* Student management
* Student account suspension and activation
* Geofence premise management
* Attendance analytics
* Fraud and security logs
* Real-time attendance visibility
* Attendance exports
* Location working-hours configuration

## Platform Features

* JWT access and refresh token rotation
* Redis-backed rate limiting
* Idempotent attendance requests
* BullMQ async processing
* Fraud event processing
* Structured error handling
* Redis cache-aside architecture
* Audit-safe attendance logging
* Soft deletion support

---

# System Architecture

```text
================================================================================
|                               CLIENT LAYER                                   |
|                                                                              |
|  +---------------------------+    +--------------------------+               |
|  |  Student Mobile App       |    |  Admin Dashboard         |               |
|  |  (React Native / Expo)    |    |  (React + Vite)          |               |
|  |                           |    |                          |               |
|  |  - GPS capture            |    |  - Attendance analytics  |               |
|  |  - Geofence map           |    |  - Student management    |               |
|  |  - Check-in/check-out     |    |  - Geofence management   |               |
|  +---------------------------+    +--------------------------+               |
|              | HTTPS / API                    | HTTPS / API                  |
================================================================================
                  |
                  v
================================================================================
|                               BACKEND LAYER                                  |
|                                                                              |
|  +-----------------------------------------------------------------------+   |
|  |                     API Gateway + Authentication                      |   |
|  |                JWT + RBAC + Rate Limiting + Validation                |   |
|  +-----------------------------------------------------------------------+   |
|                    |                              |                          |
|                    v                              v                          |
|  +---------------------------+   +---------------------------+               |
|  |  Geofence Service         |   |  Attendance Service       |               |
|  |  Haversine validation     |   |  Check-in/check-out       |               |
|  |  Redis cache lookup       |   |  Duration calculation     |               |
|  +---------------------------+   +---------------------------+               |
|                    |                              |                          |
|                    v                              v                          |
|  +---------------------------+   +---------------------------+               |
|  |  Notification Service     |   |  Fraud Detection Worker   |               |
|  |  FCM notifications        |   |  Risk scoring             |               |
|  |  Alerts/reminders         |   |  Velocity validation      |               |
|  +---------------------------+   +---------------------------+               |
|                                                                              |
|                         +---------------------------+                        |
|                         |     BullMQ + Redis        |                        |
|                         |   Queues + Cron Jobs      |                        |
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
|  | users              |   | active_sessions    |   | map rendering        |  |
|  | locations          |   | geofence_cache     |   | geocoding            |  |
|  | attendance_logs    |   | queues             |   | geofence UI          |  |
|  | sessions           |   | rate_limits        |   |                      |  |
|  | notifications      |   | revoked_tokens     |   |                      |  |
|  +--------------------+   +--------------------+   +----------------------+  |
================================================================================
```

---

# Technology Stack

## Mobile Application

* React Native
* Expo
* TypeScript
* React Navigation
* Expo Location
* Axios
* React Native Maps

## Web Admin Dashboard

* React 19
* TypeScript
* Vite 6
* React Router
* Tailwind CSS 4
* Leaflet
* React Leaflet
* Lucide Icons
* Axios

## Backend

* Node.js
* Express.js
* PostgreSQL
* Prisma ORM
* Redis
* BullMQ
* JWT Authentication
* Zod Validation

## Infrastructure

* Docker
* CI/CD pipelines
* Render deployment support
* Redis-backed queues
* Structured logging
* Rate limiting

---

# Monorepo Structure

```text
InDaZone/
│
├── apps/
│   ├── mobile/
│   │   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── hooks/
│   │   └── services/
│   │
│   ├── web/
│   │   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   └── routes/
│   │
│   └── backend/
│       ├── src/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       ├── queues/
│       ├── prisma/
│       └── utils/
│
├── packages/
├── docker/
├── scripts/
└── docs/
```

---

# Authentication and Security

## Authentication Model

The platform uses JWT-based authentication with refresh token rotation.

### Access Token

* Short-lived
* 15-minute expiry
* Attached via `Authorization: Bearer <token>`

### Refresh Token

* 7-day expiry
* Single-use rotation
* Stored in the session table
* Invalidated on logout

## Session Enforcement

* Student sessions are single-device enforced
* Login replaces previous active student sessions
* Sessions are linked to:

  * `userId`
  * `deviceId`
  * `refreshToken`

## Role-Based Access Control

Supported roles:

* `ADMIN`
* `STUDENT`

Admin-only routes are protected using RBAC middleware.

## Security Features

* JWT verification
* Refresh token rotation
* Redis-backed rate limiting
* Replay attack protection
* Idempotent attendance APIs
* GPS accuracy validation
* Fraud logging
* Device fingerprint validation
* Soft deletion support
* Structured error middleware
* SSL pinning support for mobile clients

---

# Attendance Workflow

## Check-In Flow

```text
Student taps check-in
        |
        v
Device captures GPS coordinates
        |
        v
POST /attendance/checkin
        |
        v
Server-side geofence validation
        |
        +--> Outside radius -> Reject request
        |
        +--> Inside radius -> Create attendance record
                                status = PENDING
```

## Check-Out Flow

```text
Student taps check-out
        |
        v
POST /attendance/checkout
        |
        v
Validate same-day check-in exists
        |
        v
Calculate attendance duration
        |
        +--> duration >= minimum hours -> PRESENT
        |
        +--> duration < minimum hours -> ABSENT
```

## Attendance Rules

* Default geofence radius: `100 meters`
* Minimum valid duration: `6 hours`
* GPS accuracy above `100m` is rejected
* Timestamps older than `30 seconds` are rejected
* Duplicate attendance is prevented using idempotency and DB constraints

---

# Backend Services

## Auth Service

Responsibilities:

* Login
* Registration
* Token refresh
* Session management
* Password management
* RBAC validation

## Attendance Service

Responsibilities:

* Check-in processing
* Check-out processing
* Duration calculation
* Attendance summaries
* Attendance history
* Idempotency enforcement

## Geofence Service

Responsibilities:

* Server-side Haversine calculations
* Radius validation
* Redis cache lookup
* Location validation

## Notification Service

Responsibilities:

* FCM push notifications
* Attendance reminders
* Alert delivery

## Fraud Detection Worker

Responsibilities:

* Impossible velocity detection
* Device mismatch detection
* GPS spoofing indicators
* Risk scoring
* Fraud event logging

---

# API Overview

## Base URL

```text
http://localhost:3000/api/v1
```

## Authentication Routes

| Method | Endpoint             | Description              |
| ------ | -------------------- | ------------------------ |
| POST   | `/auth/register`     | Register admin account   |
| POST   | `/auth/login`        | Login and receive tokens |
| POST   | `/auth/refresh`      | Rotate refresh token     |
| POST   | `/auth/logout`       | Logout session           |
| GET    | `/auth/me`           | Current user profile     |
| PATCH  | `/auth/me/password`  | Change password          |
| PATCH  | `/auth/me/fcm-token` | Update push token        |

## Attendance Routes

| Method | Endpoint               | Description        |
| ------ | ---------------------- | ------------------ |
| POST   | `/attendance/checkin`  | Student check-in   |
| POST   | `/attendance/checkout` | Student check-out  |
| GET    | `/attendance/today`    | Current attendance |
| GET    | `/attendance/history`  | Attendance history |
| GET    | `/attendance/summary`  | Attendance summary |

## Geofence Routes

| Method | Endpoint                          | Description          |
| ------ | --------------------------------- | -------------------- |
| GET    | `/geofence/validate`              | Validate coordinates |
| GET    | `/geofence/locations`             | List locations       |
| GET    | `/geofence/locations/:locationId` | Location details     |
| POST   | `/geofence/locations`             | Create location      |
| PUT    | `/geofence/locations/:id`         | Update location      |
| DELETE | `/geofence/locations/:id`         | Delete location      |

## Admin Routes

| Method | Endpoint                                  | Description          |
| ------ | ----------------------------------------- | -------------------- |
| GET    | `/admin/dashboard`                        | Dashboard metrics    |
| GET    | `/admin/attendance`                       | Attendance logs      |
| GET    | `/admin/students`                         | Student list         |
| POST   | `/admin/students`                         | Create student       |
| PATCH  | `/admin/students/:id/status`              | Update status        |
| GET    | `/admin/reports`                          | Export jobs          |
| GET    | `/admin/config`                           | Global config        |
| PATCH  | `/admin/config/working-hours/:locationId` | Update working hours |

## Notifications and Fraud

| Method | Endpoint                  | Description            |
| ------ | ------------------------- | ---------------------- |
| GET    | `/notifications`          | User notifications     |
| PATCH  | `/notifications/:id/read` | Mark notification read |
| GET    | `/fraud`                  | Fraud logs             |

---

# Mobile Application

The student mobile application is responsible for secure attendance capture and real-time geofence awareness.

## Mobile Features

* Secure authentication
* Attendance check-in/check-out
* Live location validation
* Geofence map visualization
* Distance-to-boundary indicators
* Attendance history
* Attendance summaries
* Push notifications
* Role-aware screens
* API retry and offline-safe handling

## Mobile Permissions

* Foreground location permission
* Optional background location permission
* Notification permission

## Mobile API Integration

The mobile app integrates directly with:

* `/auth/*`
* `/attendance/*`
* `/geofence/*`
* `/notifications/*`

---

# Web Admin Dashboard

The admin dashboard is a React + Vite application used by administrators for attendance operations and monitoring.

## Dashboard Features

### Overview Dashboard

* Total students
* Present today
* Absent today
* Late today
* Active locations
* Attendance trends
* Current admin profile details

### Attendance Monitoring

* Paginated attendance records
* Attendance filtering
* Student identity display
* Status and punctuality badges
* Check-in/check-out timestamps
* Duration tracking

### Student Management

* Student directory
* Search and filtering
* Student registration
* Bulk student upload
* Student suspension and activation

### Premises Management

* Geofence creation
* Geofence editing
* Geofence deletion
* Interactive maps
* Radius visualization
* Coordinate validation

### Fraud and Security Logs

* Fraud event listing
* Risk-level indicators
* Event details
* Security monitoring

## Session Handling

The dashboard uses:

* Access token storage
* Refresh token rotation
* Axios interceptors
* Protected routes
* Automatic logout on refresh failure

---

# Database Design

## Core Tables

### users

| Field         | Description        |
| ------------- | ------------------ |
| id            | UUID primary key   |
| name          | User full name     |
| email         | User email         |
| password_hash | Hashed password    |
| role          | ADMIN/STUDENT      |
| status        | ACTIVE/SUSPENDED   |
| studentCode   | Student identifier |

### locations

| Field        | Description      |
| ------------ | ---------------- |
| id           | UUID primary key |
| name         | Premise name     |
| latitude     | Latitude         |
| longitude    | Longitude        |
| radiusMeters | Geofence radius  |

### attendance_logs

| Field         | Description                 |
| ------------- | --------------------------- |
| id            | UUID primary key            |
| studentId     | Linked student              |
| locationId    | Linked location             |
| checkInTime   | Check-in timestamp          |
| checkOutTime  | Check-out timestamp         |
| durationHours | Attendance duration         |
| status        | PRESENT/LATE/ABSENT/PENDING |
| punctuality   | ON_TIME/LATE                |

### sessions

| Field        | Description          |
| ------------ | -------------------- |
| id           | UUID primary key     |
| userId       | Linked user          |
| deviceId     | Device fingerprint   |
| refreshToken | Stored refresh token |
| expiresAt    | Expiration timestamp |

---

# Redis and Queue Architecture

Redis is used for:

* Rate limiting
* Active session caching
* Idempotency locks
* Queue processing
* Geofence caching
* Token revocation

## BullMQ Queues

### attendance-events

Processes:

* Fraud detection
* Statistics aggregation
* Notification dispatching
* Audit logging

## Cache Strategy

* Cache-aside pattern
* Geofence TTL: 10 minutes
* Automatic invalidation on updates

---

# Fraud Prevention and Validation

## Validation Layers

### GPS Accuracy Validation

Requests are rejected when:

```text
accuracyMeters > 100
```

### Replay Attack Prevention

Requests are rejected when timestamps are stale.

```text
Maximum allowed age: 30 seconds
```

### Device Validation

Sessions are bound to device identifiers.

### Impossible Travel Detection

Velocity analysis is performed between consecutive location events.

### Idempotency Protection

Attendance endpoints support:

```http
Idempotency-Key: <unique-request-id>
```

This prevents duplicate attendance writes caused by retries or race conditions.

---

# Environment Configuration

## Backend

```env
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret
GOOGLE_MAPS_API_KEY=your_maps_key
```

## Web Dashboard

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Mobile Application

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

# Local Development Setup

## Backend

```bash
cd apps/backend
npm install
npm run dev
```

## Web Dashboard

```bash
cd apps/web
npm install
npm run dev
```

## Mobile Application

```bash
cd apps/mobile
npm install
npx expo start
```

---

# Deployment Strategy

## Backend

Recommended:

* Render
* Railway
* AWS
* Docker containers

## Web Dashboard

Recommended:

* Vercel
* Netlify

## Database

Recommended:

* PostgreSQL managed hosting
* Daily backups
* Point-in-time recovery

## Redis

Recommended:

* Redis Cloud
* Managed Redis instance

---

# Observability and Monitoring

## Logging

* Structured logging
* Attendance audit trails
* Fraud event tracking
* API request tracing

## Metrics

Recommended production metrics:

* Check-in latency
* Queue backlog
* Attendance success rate
* Geofence rejection rate
* Active sessions
* Fraud event counts

## Monitoring Stack

Recommended:

* Prometheus
* Grafana
* Centralized logging
* Alerting pipelines

---

# Roadmap

## Phase 1 — Foundation

* Monorepo setup
* CI/CD pipeline
* JWT authentication
* RBAC middleware
* Database schema
* Environment separation
* API versioning
* Structured logging

## Phase 2 — Core Geofencing

* Geofence validation
* Attendance endpoints
* Redis cache layer
* Rate limiting
* Replay protection
* Redis fallback handling

## Phase 3 — Attendance Validation

* Attendance duration logic
* Queue integration
* Fraud event processing
* Midnight auto-close handling
* Nightly cron sweeps

## Phase 4 — Mobile Application

* Student application
* Location permissions
* Geofence map
* Push notifications
* Offline-safe UI handling

## Phase 5 — Admin Dashboard

* Attendance analytics
* Student management
* Geofence management
* CSV exports
* Real-time attendance updates
* Audit log interface

## Phase 6 — Hardening and Launch

* Fraud detection improvements
* SSL pinning
* Load testing
* Postgres partitioning
* Backup strategy
* Monitoring and alerting

---

# Future Enhancements

Planned improvements include:

* Bulk student import APIs
* Advanced reporting exports
* PDF and CSV generation queues
* Real-time WebSocket attendance streams
* Advanced device mismatch enforcement
* Multi-campus support
* Offline attendance sync
* AI-assisted fraud detection
* Admin-triggered broadcast notifications

---

# Production Principles

The platform is designed around the following engineering principles:

* Never trust client-side geofence validation
* Keep attendance writes idempotent
* Validate every attendance action server-side
* Treat location as one signal among several
* Maintain complete attendance auditability
* Separate synchronous attendance writes from asynchronous fraud analysis
* Prioritize operational reliability and scalability

---

# License

This project is intended for academic, institutional, and enterprise attendance management use cases.

All rights reserved.
