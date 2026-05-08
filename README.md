# InDaZone

GPS-based attendance and geofencing platform with secure server-side validation, real-time attendance monitoring, fraud detection, and role-based management for students and administrators.

---

## Overview

InDaZone is a full-stack attendance management system that validates attendance using real-time GPS geofencing and server-side verification.

Students can only check in and check out when physically inside an authorized geofence. Attendance validity is determined using:

- Geofence proximity validation
- GPS accuracy validation
- Timestamp verification
- Session duration calculation
- Fraud and spoofing detection mechanisms

The platform includes:

- Mobile application for students
- Web admin dashboard for administrators
- REST API backend
- PostgreSQL database
- Redis cache and queue system
- Async fraud and notification processing

---
## Deployment Links

### Student Mobile App (React Native + Expo)
Live Demo:  
[gps-based-attendance-system-j4mc.vercel.app](https://gps-based-attendance-system-j4mc.vercel.app/?utm_source=chatgpt.com)
- before using this first register as admin and add your student account from admin dashboard - students page

---

### Admin Dashboard (React + Vite)
Live Demo:  
[gps-based-attendance-system-khaki.vercel.app](https://gps-based-attendance-system-khaki.vercel.app/attendance?utm_source=chatgpt.com)
- register as admin , set your geofence location, and then add students manually, or through a json file.

---

### Backend API (Node.js + Express + TypeScript)
API Base URL:  
[gps-attendance-api.onrender.com](https://gps-attendance-api.onrender.com/?utm_source=chatgpt.com)

> **Note:** Since the backend is hosted on Render free tier, the server may spin down after inactivity. Please wait a few seconds for it to wake up before using the frontend applications.

---


## Core Features

### Attendance Validation

- Server-side geofence enforcement
- GPS accuracy threshold validation
- Timestamp replay protection
- Minimum duration enforcement
- Idempotent attendance requests
- Single attendance session per day

### Student Features

- Secure login
- GPS-based check-in and check-out
- Live geofence validation
- Attendance history
- Attendance percentage tracking
- Real-time attendance status
- Push notification support

### Admin Features

- Attendance monitoring dashboard
- Student management
- Geofence location management
- Fraud and security logs
- Attendance analytics
- Daily attendance statistics
- Working-hours configuration

### Security Features

- JWT authentication
- Refresh-token rotation
- Role-based access control
- Redis-backed rate limiting
- Device-based session enforcement
- Fraud detection pipeline
- Impossible velocity detection
- GPS spoofing detection
- Request idempotency protection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Application | React Native + Expo |
| Web Dashboard | React 19 + Vite + TypeScript |
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Cache Layer | Redis |
| Queue System | BullMQ |
| Authentication | JWT + Refresh Tokens |
| Maps | Leaflet / React-Leaflet |
| Styling | Tailwind CSS 4 |
| Infrastructure | Docker + Docker Compose |

---

## Architecture

### Client Applications

#### Mobile Application

Student-facing mobile application built using React Native and Expo.

Features include:

- Authentication
- GPS capture
- Geofence validation
- Attendance actions
- Attendance history
- Push notifications

#### Web Admin Dashboard

Admin-only dashboard built using React and Vite.

Features include:

- Attendance analytics
- Student operations
- Geofence management
- Fraud monitoring
- Dashboard insights
- Attendance drill-down views

---

## Backend Services

### Authentication Service

- JWT access token validation
- Refresh-token rotation
- Role-based authorization
- Session persistence
- Single-device enforcement for students

### Attendance Service

- Check-in validation
- Check-out validation
- Duration calculation
- Attendance classification
- Idempotent attendance handling

### Geofence Service

- Haversine distance calculation
- Radius validation
- Redis cache-aside lookup
- Server-side geofence enforcement

### Fraud Detection System

- Impossible velocity checks
- Device mismatch detection
- Suspicious activity logging
- Async fraud event processing

### Notification Service

- FCM token registration
- Notification delivery
- Attendance alerts
- System notifications

---

## Attendance Rules

| Rule | Description |
|---|---|
| Geofence Radius | Default 100 meters |
| GPS Accuracy Limit | Requests above 100m accuracy are rejected |
| Timestamp Window | Requests older than 30 seconds are rejected |
| Minimum Duration | 6 hours minimum for valid attendance |
| Daily Constraint | One attendance session per student per day |

---

## Attendance Status Logic

| Status | Description |
|---|---|
| PRESENT | Valid duration and valid geofence activity |
| ABSENT | Invalid duration or invalid attendance |
| PENDING | Checked in but not checked out |
| LATE | Check-in exceeds configured late threshold |

---

## Project Structure

```text
indazone/
├── apps/
│   ├── mobile/
│   │   ├── src/
│   │   └── app.json
│   │
│   ├── web/
│   │   ├── src/
│   │   └── vite.config.ts
│   │
│   └── backend/
│       ├── src/
│       ├── prisma/
│       └── package.json
│
├── packages/
│   └── shared/
│
├── docker/
│
├── .env.example
├── docker-compose.yml
└── README.md
````

---

## API Base URL

```text
http://localhost:3000/api/v1
```

---

## Authentication Model

### Access Tokens

* JWT-based
* Short-lived authentication token
* Default TTL: 15 minutes

### Refresh Tokens

* Rotating refresh tokens
* Default TTL: 7 days
* Stored in database sessions table

### Protected Routes

All protected routes require:

```http
Authorization: Bearer <access_token>
```

---

## User Roles

| Role    | Description                                |
| ------- | ------------------------------------------ |
| ADMIN   | Full administrative access                 |
| STUDENT | Attendance operations and dashboard access |

---

## API Modules

### Authentication

| Method | Endpoint             |
| ------ | -------------------- |
| POST   | `/auth/register`     |
| POST   | `/auth/login`        |
| POST   | `/auth/refresh`      |
| POST   | `/auth/logout`       |
| GET    | `/auth/me`           |
| PATCH  | `/auth/me/password`  |
| PATCH  | `/auth/me/fcm-token` |

### Attendance

| Method | Endpoint               |
| ------ | ---------------------- |
| POST   | `/attendance/checkin`  |
| POST   | `/attendance/checkout` |
| GET    | `/attendance/today`    |
| GET    | `/attendance/history`  |
| GET    | `/attendance/summary`  |

### Geofence

| Method | Endpoint                          |
| ------ | --------------------------------- |
| GET    | `/geofence/validate`              |
| GET    | `/geofence/locations`             |
| GET    | `/geofence/locations/:locationId` |

### Admin

| Method | Endpoint                     |
| ------ | ---------------------------- |
| GET    | `/admin/dashboard`           |
| GET    | `/admin/attendance`          |
| GET    | `/admin/students`            |
| POST   | `/admin/students`            |
| PATCH  | `/admin/students/:id/status` |
| GET    | `/admin/reports`             |
| GET    | `/admin/config`              |

### Notifications

| Method | Endpoint                  |
| ------ | ------------------------- |
| GET    | `/notifications`          |
| PATCH  | `/notifications/:id/read` |

### Fraud Logs

| Method | Endpoint |
| ------ | -------- |
| GET    | `/fraud` |

---

## Admin Dashboard Features

### Overview Dashboard

* Total students
* Present today
* Absent today
* Late students
* Active locations
* Daily attendance drill-down

### Attendance Monitoring

* Paginated attendance records
* Status and punctuality indicators
* Attendance filtering
* Date-based attendance querying

### Student Management

* Student creation
* Student suspension and activation
* Student search
* Bulk student upload

### Geofence Management

* Premise creation
* Radius configuration
* Interactive map visualization
* Geofence editing
* Premise deletion

### Fraud Monitoring

* Suspicious activity logs
* Fraud severity indicators
* GPS spoof detection events
* Device mismatch events

---

## Mobile Application Features

### Authentication

* Secure login
* Session persistence
* Token refresh handling

### Attendance Operations

* GPS-based check-in
* GPS-based check-out
* Real-time geofence validation
* Attendance status tracking

### Student Dashboard

* Today's attendance
* Check-in and check-out timestamps
* Duration tracking
* Attendance percentage
* Attendance history

---

## Geofence Validation Flow

```text
1. Device captures GPS coordinates
2. Request sent to backend API
3. Backend validates:
   - JWT token
   - Timestamp freshness
   - GPS accuracy
   - Geofence radius
4. Attendance action recorded
5. Fraud checks queued asynchronously
```

---

## Attendance Processing Logic

### Check-In

* Validates GPS coordinates
* Verifies geofence distance
* Verifies GPS accuracy
* Verifies timestamp freshness
* Creates attendance record

### Check-Out

* Validates geofence again
* Calculates duration
* Determines attendance status
* Updates attendance record

---

## Fraud Prevention Measures

* Server-side validation only
* GPS accuracy enforcement
* Replay attack prevention
* Impossible velocity detection
* Device fingerprint tracking
* Redis-backed rate limiting
* Session enforcement
* Async fraud analysis

---

## Redis Usage

Redis is used for:

* Rate limiting
* Queue management
* Geofence caching
* Active session storage
* Idempotency key storage

---

## BullMQ Queues

Async background jobs include:

* Fraud analysis
* Notification delivery
* Attendance aggregation
* Scheduled cleanup tasks

---

## Database Models

### User

Stores:

* Authentication data
* Role information
* Student metadata
* Device metadata

### Session

Stores:

* Refresh tokens
* Device sessions
* Session expiration

### AttendanceLog

Stores:

* Check-in timestamps
* Check-out timestamps
* Coordinates
* Attendance status
* Duration data

### Location

Stores:

* Geofence center coordinates
* Radius configuration
* Working hours
* Late thresholds

### FraudLog

Stores:

* Fraud events
* Risk scores
* Suspicious activity records

---

## Environment Variables

### Backend

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=3000
```

### Web Dashboard

```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## Local Development Setup

### Prerequisites

* Node.js 20+
* Docker
* Docker Compose
* PostgreSQL
* Redis

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd indazone
```

---

## Start Infrastructure

```bash
docker compose up --build
```

---

## Backend Setup

```bash
cd apps/backend

npm install

npx prisma generate

npx prisma migrate dev

npm run dev
```

Backend server:

```text
http://localhost:3000
```

---

## Web Dashboard Setup

```bash
cd apps/web

npm install

npm run dev
```

Dashboard URL:

```text
http://localhost:5173
```

---

## Mobile App Setup

```bash
cd apps/mobile

npm install

npx expo start
```

---

## Docker Commands

### Start Services

```bash
docker compose up -d
```

### Stop Services

```bash
docker compose down
```

### View Logs

```bash
docker compose logs -f
```

---

## Error Handling

Standard error response:

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

## Common Error Codes

| HTTP | Error                |
| ---- | -------------------- |
| 400  | VALIDATION_ERROR     |
| 400  | STALE_TIMESTAMP      |
| 400  | LOW_GPS_ACCURACY     |
| 401  | UNAUTHORIZED         |
| 401  | ACCOUNT_SUSPENDED    |
| 403  | FORBIDDEN            |
| 403  | OUTSIDE_GEOFENCE     |
| 404  | LOCATION_NOT_FOUND   |
| 409  | ALREADY_CHECKED_IN   |
| 409  | DUPLICATE_ATTENDANCE |
| 500  | INTERNAL_ERROR       |

---

## Current System Capabilities

* GPS-based attendance validation
* Admin dashboard analytics
* Redis-backed caching and rate limiting
* JWT authentication system
* Refresh-token rotation
* Role-based access control
* Fraud logging
* Async job processing
* Geofence management
* Attendance analytics
* Student management

---

## Planned Enhancements

* CSV and PDF report exports
* Real-time attendance updates via WebSocket/SSE
* Face verification
* AI-based anomaly detection
* Advanced analytics
* Bulk student import endpoint
* Device mismatch enforcement
* Attendance audit trails

---

## Notes

* All timestamps use ISO 8601 UTC format
* All IDs are UUID v4
* Geofence validation is always server-side
* Soft-deleted records are excluded from responses
* Client-side geofence checks are UX-only

---

## Documentation Sources

This README was updated using the following project documents:

* Existing README 
* Backend API Reference 
* Web Admin Portal Documentation 
* Architecture and Roadmap Documentation 

```

