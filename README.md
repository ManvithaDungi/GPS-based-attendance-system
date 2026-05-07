# InDaZone - GPS-Based Attendance System

**Tagline:** Not in Zone, No Attendance.

---

## Overview

InDaZone is a GPS-based attendance system that allows students to check in and check out only when they are physically inside a defined geofence (default: 100 meters from the premises center).

Attendance is validated using both **location** and **duration**:

- Check-in and check-out must occur within the authorized zone.
- Presence duration must be at least **6 hours** to be marked as `PRESENT`.
- Attendance below 6 hours is marked as `ABSENT` (invalid for the day).

---

## Tech Stack

- **Mobile**: React Native with Expo
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Infrastructure**: Docker + Docker Compose
- **Shared**: TypeScript types and constants

---

## Deployed Links

- **Mobile webiste**: React Native with Expo - https://gps-based-attendance-system-j4mc.vercel.app/
- **Admin webiste**: React with Vite - https://gps-based-attendance-system-khaki.vercel.app/attendance
- **Backend**: Node.js + Express + TypeScript - https://gps-attendance-api.onrender.com/ - make sure your backend is running before u open the websites
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Infrastructure**: Docker + Docker Compose
- **Shared**: TypeScript types and constants

---

## Project Structure

```
indazone/
├── apps/
│   ├── mobile/           → Expo React Native student/admin app
│   └── backend/          → Express + Prisma REST API
├── packages/
│   └── shared/           → Shared TypeScript types
├── database/
│   └── prisma/           → Database schema and migrations
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── postgres/         → PostgreSQL initialization
├── .env.example
├── .gitignore
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 20+ and npm
- Docker and Docker Compose
- Git

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone <repo-url>
cd indazone

# Copy environment variables
cp .env.example .env

# Update .env with your configuration (optional for development)
```

### 2. Start Infrastructure (Docker)

```bash
# Start PostgreSQL and Redis
docker compose up --build

# Verify services are running
docker compose ps
```

### 3. Setup Backend

```bash
cd apps/backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view database
npx prisma studio

```

The backend API will be running on `http://localhost:3000`

### 4. Setup Mobile App

```bash
cd apps/mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Choose platform:
# - 'a' for Android
# - 'i' for iOS
# - 'w' for web
```

### 4. Setup Web Admin Dashboard App

```bash
cd apps/web

# Install dependencies
npm install

# Start Expo development server
npm run dev

```
The dashboard will be running on `http://localhost:5173`

### 5. Run Full Stack with Docker Compose

```bash
# From project root, start all services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f redis

# Stop services
docker compose down
```

---

## Core Objectives

- Ensure attendance integrity through **server-side geofence enforcement**.
- Prevent proxy attendance using **continuous validation and anti-fraud mechanisms**.
- Maintain accurate and reliable **daily attendance records**.
- Provide administrators with **real-time attendance insights and analytics**.

---

## Key Rules

- **Geofence Radius:** 100 meters (configurable per premises).
- **Source of Truth:** Server-side validation for both distance and time.
- **Daily Attendance Constraint:** One attendance record per student per day.

---

## Attendance Classification

| Status     | Criteria                                     |
|------------|----------------------------------------------|
| PRESENT    | Inside geofence + duration ≥ 6 hours         |
| ABSENT     | Duration < 6 hours OR invalid check-in/out   |
| LATE       | Check-in after defined threshold time        |
| ON TIME    | Check-in within allowed time window          |

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Student Attendance
- `POST /api/attendance/checkin` - Record check-in
- `POST /api/attendance/checkout` - Record check-out
- `GET /api/attendance/me` - Get personal attendance summary
- `GET /api/attendance/history` - Get attendance history

### Geofence
- `GET /api/geofence/nearby` - Get nearby premises
- `GET /api/geofence/:premiseId` - Get premise details

### Admin
- `GET /api/admin/attendance` - Get all students' attendance
- `GET /api/admin/students` - List all students
- `GET /api/admin/students/:studentId/attendance` - Student's attendance history
- `POST /api/admin/premises` - Create new premise
- `GET /api/admin/premises` - List all premises

---

## Database Schema

### User
- User authentication and role management (STUDENT, ADMIN)

### Premise
- Geofence location data with radius configuration

### AttendanceLog
- Daily attendance records with check-in/out timestamps
- Status tracking (PRESENT, ABSENT, LATE, PENDING)
- Unique constraint: one record per (student, premise, date)

### Session
- JWT refresh token management
- Token expiration handling

---

## Admin Module

### Overview

The Admin Panel provides centralized control and real-time visibility into attendance data across all students.

### Key Features

- Monitor daily attendance statistics
- Track punctuality and discipline
- View summarized and detailed reports(monthly, daily , yearly)
- Manage student records 
- should also set the centre location for geofence 

---

## Admin frontend features

The admin should be able to view the following **daily insights**:

- **Total Students**
- **Present Today**
- **Absent Today**
- **On Time Students**
- **Late Students**
- 

---

## Sample summary fro admin

```
Date: YYYY-MM-DD

Total Students:        500
Present Today:         420
Absent Today:          50

On Time:               300
Late:                  120
```

---

## Student Module

### Overview

The Student Dashboard provides a simple and transparent interface for tracking attendance, checking status, and performing check-in/check-out operations.

### Key Features

- One-tap **Check-In / Check-Out** (within geofence)
- Real-time attendance status
- Daily and historical attendance view
- Alerts for late check-in or insufficient duration

---

## Student Frontend features

Each student should be able to view:

- **Today's Status** (Present / Absent / Late)
- **Check-In Time**
- **Check-Out Time**
- **Total Duration Today**
- **Attendance Percentage**

---

## Sample Student Dashboard Summary

```

Date: YYYY-MM-DD

Status:                PRESENT
Check-In Time:         09:05 AM
Check-Out Time:        03:30 PM
Total Duration:        6h 25m

Attendance %:          88%


```

---

## Functional Requirements

### Student Side

- Secure authentication
- GPS-based check-in/check-out
- Real-time geofence validation
- Attendance tracking and history

### Admin Side

- Dashboard with aggregated metrics
- Student-wise attendance tracking
- Reports and analytics

---

## Validation Logic

1. **Geofence Validation**
   - Must be inside allowed radius for check-in and check-out.

2. **Time Validation**
   - Duration ≥ 6 hours for valid presence.

3. **Late Detection**
   - Based on predefined start time.


---

## Anti-Fraud Measures

- Impossible velocity detection
- Device fingerprint tracking
- Continuous location validation
- Strict server-side enforcement

---

## Future Enhancements

- Face recognition verification
- AI-based anomaly detection
- Smart notifications
- Integration with academic systems

---


