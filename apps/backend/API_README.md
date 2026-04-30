# InDaZone — API Reference

> **Base URL:** `http://localhost:3000/api/v1`
> **Auth:** All protected routes require `Authorization: Bearer <access_token>` header
> **Roles:** `[S]` = Student only · `[A]` = Admin only · `[S/A]` = Both
> **Note:** All endpoint paths shown below are relative to the base URL. For example, `POST /auth/register` → `POST http://localhost:3000/api/v1/auth/register`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Attendance](#2-attendance)
3. [Geofence](#3-geofence)
4. [Student Dashboard](#4-student-dashboard)
5. [Admin Dashboard](#5-admin-dashboard)
6. [Admin — Student Management](#6-admin--student-management)
7. [Admin — Locations Management](#7-admin--locations-management)
8. [Admin — Reports & Export](#8-admin--reports--export)
9. [Notifications](#9-notifications)
10. [Fraud Logs](#10-fraud-logs)
11. [System Configuration](#11-system-configuration)
12. [System Design Enhancements](#12-system-design-enhancements)
13. [Error Responses](#13-error-responses)

---

## 1. Authentication

### POST `/auth/register`
Register a new admin account (admin bootstrap only). Students cannot self-register; they must be added by an admin via `POST /admin/students`.

**Access:** Public (restricted to `role: ADMIN` server-side)

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword",
  "role": "ADMIN"
}
```

**Response `201`:**
```json
{
  "message": "Admin registered successfully",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN",
    "studentCode": null,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  }
}
```

**Response `403` (if role is not ADMIN):**
```json
{
  "error": "FORBIDDEN",
  "message": "Only ADMIN role can self-register. Students must be added by an admin.",
  "statusCode": 403
}
```

---

### POST `/auth/login`
Login and receive access + refresh tokens.

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword",
  "deviceId": "device-fingerprint-string"
}
```

> Students are locked to one device per session. If logging in from a different device, the previous session is invalidated and a new one is created for the new device. Sessions are tracked in the `Session` model, bound to `userId` and `deviceId`.

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "studentCode": "CS2024001"
  }
}
```

**Response `401` (account suspended):**
```json
{
  "error": "ACCOUNT_SUSPENDED",
  "message": "Your account has been suspended. Contact admin for details.",
  "statusCode": 401
}
```

---

### POST `/auth/refresh`
Get a new access token using a refresh token. Implements single-use refresh token rotation for security.

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

> Refresh tokens are stored in the `Session` model and are single-use. After refresh, the previous token is invalidated. If a previously used token is reused, all sessions for the user/device may be invalidated as a security measure.

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Response `401` (token already used or invalid):**
```json
{
  "error": "INVALID_REFRESH_TOKEN",
  "message": "Refresh token has been revoked or is invalid",
  "statusCode": 401
}
```

---

### POST `/auth/logout`
Invalidate the current session/refresh token. Deletes the corresponding `Session` record.

**Access:** Protected `[S/A]`

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`:**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET `/auth/me`
Get current authenticated user's profile.

**Access:** Protected `[S/A]`

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "STUDENT",
  "status": "ACTIVE",
  "studentCode": "CS2024001",
  "deviceId": "device-fingerprint-string",
  "fcmToken": "fcm-token-string",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

> `status` reflects the `UserStatus` enum: `ACTIVE` or `SUSPENDED`. `deviceId` and `fcmToken` are only returned on this endpoint — never on public/list responses.

---

### PATCH `/auth/me/fcm-token`
Update the FCM push notification token stored on the `User` record.

**Access:** Protected `[S/A]`

**Request Body:**
```json
{
  "fcmToken": "fcm-token-string"
}
```

**Response `200`:**
```json
{
  "message": "FCM token updated"
}
```

---

### PATCH `/auth/me/password`
Change the current user's password.

**Access:** Protected `[S/A]`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response `200`:**
```json
{
  "message": "Password changed successfully"
}
```

**Response `401` (invalid current password):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Current password is incorrect",
  "statusCode": 401
}
```

---

## 2. Attendance

### POST `/attendance/checkin`
Check in to the location. Validates geofence server-side using the Haversine formula. Supports idempotency to prevent duplicate records on retries.

**Access:** Protected `[S]`

**Headers:**
```http
Idempotency-Key: <unique-request-id>
```

**Request Body:**
```json
{
  "lat": 19.0760,
  "lng": 72.8777,
  "timestamp": "2024-01-15T09:05:00.000Z",
  "locationId": "uuid",
  "accuracyMeters": 10
}
```

> `timestamp` must not be older than 30 seconds (replay protection). `accuracyMeters` is the GPS accuracy reported by the device — requests with low accuracy are rejected to prevent location spoofing.

**Response `200`:**
```json
{
  "message": "Check-in successful",
  "attendance": {
    "id": "uuid",
    "locationId": "uuid",
    "date": "2024-01-15",
    "checkInTime": "2024-01-15T09:05:00.000Z",
    "checkInLat": 19.0760,
    "checkInLng": 72.8777,
    "checkInDistanceM": 45.3,
    "checkInAccuracyM": 10,
    "status": "PENDING",
    "punctuality": null
  }
}
```

**Response `403` (outside geofence):**
```json
{
  "error": "OUTSIDE_GEOFENCE",
  "message": "You are outside the allowed zone",
  "distanceM": 180.5,
  "allowedRadiusM": 100
}
```

**Response `401` (device mismatch):**
```json
{
  "error": "DEVICE_MISMATCH",
  "message": "You are attempting to check in from a different device than your last login",
  "statusCode": 401
}
```

**Response `404` (location not found):**
```json
{
  "error": "LOCATION_NOT_FOUND",
  "message": "The specified location does not exist",
  "statusCode": 404
}
```

---

### POST `/attendance/checkout`
Check out from the location. Finalises the `AttendanceLog` record including duration, status, and punctuality. Supports idempotency.

**Access:** Protected `[S]`

**Headers:**
```http
Idempotency-Key: <unique-request-id>
```

**Request Body:**
```json
{
  "lat": 19.0762,
  "lng": 72.8779,
  "timestamp": "2024-01-15T15:30:00.000Z",
  "locationId": "uuid",
  "accuracyMeters": 12
}
```

**Response `200`:**
```json
{
  "message": "Check-out successful",
  "attendance": {
    "id": "uuid",
    "locationId": "uuid",
    "date": "2024-01-15",
    "checkInTime": "2024-01-15T09:05:00.000Z",
    "checkInLat": 19.0760,
    "checkInLng": 72.8777,
    "checkInDistanceM": 45.3,
    "checkInAccuracyM": 10,
    "checkOutTime": "2024-01-15T15:30:00.000Z",
    "checkOutLat": 19.0762,
    "checkOutLng": 72.8779,
    "checkOutDistanceM": 52.1,
    "checkOutAccuracyM": 12,
    "durationHours": 6.42,
    "status": "PRESENT",
    "punctuality": "ON_TIME",
    "isAutoClosed": false
  }
}
```

> After check-out, fraud detection and analytics updates (`DailyStats`) are processed asynchronously via background jobs.

---

### GET `/attendance/today`
Get the current user's `AttendanceLog` record for today.

**Access:** Protected `[S]`

**Response `200`:**
```json
{
  "id": "uuid",
  "locationId": "uuid",
  "date": "2024-01-15",
  "status": "PRESENT",
  "punctuality": "ON_TIME",
  "checkInTime": "2024-01-15T09:05:00.000Z",
  "checkInLat": 19.0760,
  "checkInLng": 72.8777,
  "checkInAccuracyM": 10,
  "checkOutTime": "2024-01-15T15:30:00.000Z",
  "checkOutLat": 19.0762,
  "checkOutLng": 72.8779,
  "checkOutAccuracyM": 12,
  "durationHours": 6.42,
  "isAutoClosed": false,
  "createdAt": "2024-01-15T09:05:00.000Z",
  "updatedAt": "2024-01-15T15:30:00.000Z"
}
```

---

### GET `/attendance/history`
Get the current user's attendance history with pagination.

**Access:** Protected `[S]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Records per page (default: 30) |
| `from` | string | Start date `YYYY-MM-DD` |
| `to` | string | End date `YYYY-MM-DD` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "locationId": "uuid",
      "date": "2024-01-15",
      "status": "PRESENT",
      "punctuality": "ON_TIME",
      "checkInTime": "2024-01-15T09:05:00.000Z",
      "checkInLat": 19.0760,
      "checkInLng": 72.8777,
      "checkInAccuracyM": 10,
      "checkOutTime": "2024-01-15T15:30:00.000Z",
      "checkOutLat": 19.0762,
      "checkOutLng": 72.8779,
      "checkOutAccuracyM": 12,
      "durationHours": 6.42,
      "isAutoClosed": false,
      "createdAt": "2024-01-15T09:05:00.000Z",
      "updatedAt": "2024-01-15T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 120,
    "totalPages": 4
  }
}
```

> Soft-deleted records (`deletedAt IS NOT NULL`) are excluded from all history responses.

---

### GET `/attendance/summary`
Get the current student's attendance summary including percentage.

**Access:** Protected `[S]`

**Response `200`:**
```json
{
  "totalDays": 120,
  "presentDays": 105,
  "absentDays": 10,
  "lateDays": 5,
  "attendancePercentage": 87.5
}
```

---

## 3. Geofence

### GET `/geofence/validate`
Validate whether a given coordinate is inside a location's geofence. GPS accuracy is also validated — low-accuracy requests are rejected.

**Access:** Protected `[S]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `lat` | float | Latitude |
| `lng` | float | Longitude |
| `locationId` | string | UUID of location |
| `accuracyMeters` | float | GPS accuracy from device (optional, recommended) |

**Response `200`:**
```json
{
  "isWithinGeofence": true,
  "distanceM": 45.3,
  "allowedRadiusM": 100,
  "location": {
    "id": "uuid",
    "name": "College Campus",
    "latitude": 19.0760,
    "longitude": 72.8777
  }
}
```

---

### GET `/geofence/locations`
Get all active locations with geofence config. Results are cached (TTL: 5–10 minutes).

**Access:** Protected `[S/A]`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "College Campus",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "radiusMeters": 100
    }
  ]
}
```

> Soft-deleted locations (`deletedAt IS NOT NULL`) are excluded.

---

### GET `/geofence/locations/:locationId`
Get a single location's geofence details including working hours.

**Access:** Protected `[S/A]`

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "College Campus",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "radiusMeters": 100,
  "workingHours": {
    "startTime": "09:00",
    "endTime": "17:00",
    "lateThresholdMins": 15,
    "minDurationHours": 6
  }
}
```

---

## 4. Student Dashboard

### GET `/student/dashboard`
Get a full summary for the student's dashboard screen. Response is cached (TTL: 30–60 seconds) using precomputed aggregates.

**Access:** Protected `[S]`

**Response `200`:**
```json
{
  "today": {
    "date": "2024-01-15",
    "status": "PRESENT",
    "punctuality": "ON_TIME",
    "checkInTime": "2024-01-15T09:05:00.000Z",
    "checkOutTime": "2024-01-15T15:30:00.000Z",
    "durationHours": 6.42
  },
  "summary": {
    "totalDays": 120,
    "presentDays": 105,
    "absentDays": 10,
    "lateDays": 5,
    "attendancePercentage": 87.5
  },
  "canCheckIn": true,
  "canCheckOut": false
}
```

---

## 5. Admin Dashboard

### GET `/admin/dashboard`
Get aggregated daily attendance stats for the admin overview. Served from precomputed `DailyStats` records — O(1) query, not computed in real-time. Cached (TTL: 30–60 seconds).

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | Date `YYYY-MM-DD` (default: today) |
| `locationId` | string | Filter by location (optional) |

**Response `200`:**
```json
{
  "date": "2024-01-15",
  "totalStudents": 500,
  "presentToday": 420,
  "absentToday": 50,
  "pendingToday": 30,
  "onTime": 300,
  "late": 120
}
```

---

### GET `/admin/attendance`
Get all students' attendance records with filters.

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | Filter by date `YYYY-MM-DD` |
| `from` | string | Start date range |
| `to` | string | End date range |
| `status` | string | `PRESENT`, `ABSENT`, `LATE`, `PENDING` |
| `locationId` | string | Filter by location |
| `page` | number | Page number |
| `limit` | number | Records per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "studentCode": "CS2024001"
      },
      "locationId": "uuid",
      "date": "2024-01-15",
      "status": "PRESENT",
      "punctuality": "ON_TIME",
      "checkInTime": "2024-01-15T09:05:00.000Z",
      "checkInLat": 19.0760,
      "checkInLng": 72.8777,
      "checkInDistanceM": 45.3,
      "checkInAccuracyM": 10,
      "checkOutTime": "2024-01-15T15:30:00.000Z",
      "checkOutLat": 19.0762,
      "checkOutLng": 72.8779,
      "checkOutDistanceM": 52.1,
      "checkOutAccuracyM": 12,
      "durationHours": 6.42,
      "isAutoClosed": false,
      "createdAt": "2024-01-15T09:05:00.000Z",
      "updatedAt": "2024-01-15T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 420,
    "totalPages": 9
  }
}
```

---

### GET `/admin/attendance/trends`
Get attendance trends for charts (daily/monthly/yearly). Sourced from `DailyStats` aggregates.

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `daily`, `monthly`, `yearly` |
| `from` | string | Start date |
| `to` | string | End date |
| `locationId` | string | Filter by location (optional) |

**Response `200`:**
```json
{
  "period": "monthly",
  "data": [
    {
      "label": "Jan 2024",
      "present": 8820,
      "absent": 1050,
      "late": 630
    }
  ]
}
```

---

## 6. Admin — Student Management

### POST `/admin/students`
Create a new student account. Only admins can do this; students cannot self-register.

**Access:** Protected `[A]`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "temporaryPassword123",
  "studentCode": "CS2024002"
}
```

> The `role` is hardcoded to `STUDENT` server-side. The `status` defaults to `ACTIVE`. `studentCode` must be globally unique.

**Response `201`:**
```json
{
  "message": "Student added successfully",
  "user": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "studentCode": "CS2024002",
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  }
}
```

**Response `409` (duplicate email or studentCode):**
```json
{
  "error": "DUPLICATE_STUDENT",
  "message": "A student with this email or studentCode already exists",
  "statusCode": 409
}
```

---

### POST `/admin/students/bulk`
Create multiple student accounts in bulk. Accepts CSV or JSON array.

**Access:** Protected `[A]`

**Request Body (JSON):**
```json
{
  "students": [
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "password": "tempPass123",
      "studentCode": "CS2024002"
    },
    {
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "password": "tempPass456",
      "studentCode": "CS2024003"
    }
  ]
}
```

**Request Body (CSV multipart upload):**
- Field name: `file`
- File format: CSV with headers `name,email,password,studentCode`

**Response `200`:**
```json
{
  "message": "Bulk import completed",
  "summary": {
    "total": 2,
    "created": 2,
    "failed": 0,
    "duplicates": 0
  },
  "created": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "studentCode": "CS2024002"
    }
  ],
  "failed": [],
  "duplicates": []
}
```

**Response `400` (invalid file format):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid CSV format. Required columns: name, email, password, studentCode",
  "statusCode": 400
}
```

---

### GET `/admin/students`
List all students with optional search and filters. Excludes soft-deleted users (`deletedAt IS NOT NULL`).

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name, email, or studentCode |
| `status` | string | `ACTIVE` or `SUSPENDED` |
| `page` | number | Page number |
| `limit` | number | Records per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "studentCode": "CS2024001",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

---

### GET `/admin/students/:studentId`
Get a specific student's profile.

**Access:** Protected `[A]`

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "studentCode": "CS2024001",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET `/admin/students/:studentId/attendance`
Get a specific student's attendance history and summary.

**Access:** Protected `[A]`

**Query Params:** Same as `GET /attendance/history`

**Response `200`:**
```json
{
  "student": {
    "id": "uuid",
    "name": "John Doe",
    "studentCode": "CS2024001"
  },
  "summary": {
    "totalDays": 120,
    "presentDays": 105,
    "absentDays": 10,
    "lateDays": 5,
    "attendancePercentage": 87.5
  },
  "data": []
}
```

---

### PATCH `/admin/students/:studentId/status`
Suspend or reactivate a student account. Updates the `UserStatus` field — a soft operation that preserves all historical data.

**Access:** Protected `[A]`

**Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

> Valid values match the `UserStatus` enum: `ACTIVE`, `SUSPENDED`. Suspended students cannot log in or check in.

**Response `200`:**
```json
{
  "message": "Student status updated",
  "student": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "studentCode": "CS2024002",
    "status": "SUSPENDED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

---

### POST `/admin/students/:studentId/reset-password`
Reset a student's password to a temporary value. Student must change it on next login.

**Access:** Protected `[A]`

**Request Body:**
```json
{
  "temporaryPassword": "tempPass123"
}
```

**Response `200`:**
```json
{
  "message": "Password reset successfully",
  "temporaryPassword": "tempPass123",
  "student": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "studentCode": "CS2024002"
  }
}
```

---

## 7. Admin — Locations Management

### POST `/admin/locations`
Create a new location with geofence config. Also creates a linked `WorkingHours` record.

**Access:** Protected `[A]`

**Request Body:**
```json
{
  "name": "College Campus",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "radiusMeters": 100,
  "workingHours": {
    "startTime": "09:00",
    "endTime": "17:00",
    "lateThresholdMins": 15,
    "minDurationHours": 6
  }
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "name": "College Campus",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "radiusMeters": 100,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "workingHours": {
    "startTime": "09:00",
    "endTime": "17:00",
    "lateThresholdMins": 15,
    "minDurationHours": 6
  }
}
```

---

### GET `/admin/locations`
List all active locations. Excludes soft-deleted locations (`deletedAt IS NOT NULL`).

**Access:** Protected `[A]`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "College Campus",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "radiusMeters": 100,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### PATCH `/admin/locations/:locationId`
Update a location's geofence or working hours config. Partially updates the `Location` and/or `WorkingHours` record.

**Access:** Protected `[A]`

**Request Body:** (all fields optional)
```json
{
  "name": "Main Campus",
  "latitude": 19.0761,
  "longitude": 72.8778,
  "radiusMeters": 150,
  "workingHours": {
    "startTime": "08:30",
    "lateThresholdMins": 10
  }
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Main Campus",
  "latitude": 19.0761,
  "longitude": 72.8778,
  "radiusMeters": 150,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "workingHours": {
    "startTime": "08:30",
    "endTime": "17:00",
    "lateThresholdMins": 10,
    "minDurationHours": 6
  }
}
```

---

### DELETE `/admin/locations/:locationId`
Soft-delete a location by setting `deletedAt`. Associated `AttendanceLog` and `DailyStats` records are retained.

**Access:** Protected `[A]`

**Response `200`:**
```json
{
  "message": "Location deleted successfully"
}
```

---

## 8. Admin — Reports & Export

### GET `/admin/reports/daily`
Generate a daily attendance report. For `csv`/`pdf` formats, the job is enqueued asynchronously via `ReportJob` — a polling URL or webhook delivers the file when ready.

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | `YYYY-MM-DD` (default: today) |
| `locationId` | string | Filter by location (optional) |
| `format` | string | `json`, `csv`, `pdf` (default: `json`) |

**Response `200` (json):**
```json
{
  "report": {
    "date": "2024-01-15",
    "generatedAt": "2024-01-15T18:00:00.000Z",
    "totalStudents": 500,
    "present": 420,
    "absent": 50,
    "late": 120,
    "onTime": 300
  },
  "data": []
}
```

**Response `202` (csv / pdf — async):**
```json
{
  "status": "processing",
  "jobId": "uuid",
  "downloadUrl": null
}
```

> Poll `GET /admin/reports/jobs/:jobId` to check status. When `status` is `DONE`, `downloadUrl` will be populated. For `json` format, results are returned synchronously.

---

### GET `/admin/reports/monthly`
Generate a monthly attendance report sourced from `DailyStats` aggregates.

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `month` | number | Month (1–12) |
| `year` | number | Year e.g. `2024` |
| `studentId` | string | Filter by student (optional) |
| `format` | string | `json`, `csv`, `pdf` |

**Response `200` (json):**
```json
{
  "month": 1,
  "year": 2024,
  "generatedAt": "2024-01-31T18:00:00.000Z",
  "totalStudents": 500,
  "totalDays": 22,
  "summary": {
    "present": 9500,
    "absent": 800,
    "late": 1200,
    "onTime": 8300,
    "pending": 0
  },
  "studentBreakdown": [
    {
      "studentId": "uuid",
      "studentCode": "CS2024001",
      "name": "John Doe",
      "attendance": 18,
      "absent": 2,
      "late": 2,
      "attendancePercentage": 82
    }
  ]
}
```

---

### GET `/admin/reports/yearly`
Generate a yearly attendance report. Monthly breakdown is sourced from `DailyStats`.

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `year` | number | Year e.g. `2024` |
| `studentId` | string | Filter by student (optional) |
| `format` | string | `json`, `csv`, `pdf` |

**Response `200` (json):**
```json
{
  "year": 2024,
  "generatedAt": "2024-12-31T23:59:59.000Z",
  "totalStudents": 500,
  "totalDays": 250,
  "summary": {
    "present": 115000,
    "absent": 9800,
    "late": 10200,
    "onTime": 105000,
    "pending": 0
  },
  "monthlyBreakdown": [
    {
      "month": 1,
      "totalDays": 22,
      "presentCount": 9500,
      "absentCount": 800,
      "lateCount": 1200,
      "attendancePercentage": 82.5
    }
  ],
  "studentBreakdown": [
    {
      "studentId": "uuid",
      "studentCode": "CS2024001",
      "name": "John Doe",
      "totalAttendance": 210,
      "totalAbsent": 30,
      "totalLate": 10,
      "attendancePercentage": 87.5
    }
  ]
}
```

---

### GET `/admin/reports/jobs/:jobId`
Poll the status of an async report generation job.

**Access:** Protected `[A]`

**Response `200`:**
```json
{
  "id": "uuid",
  "status": "DONE",
  "format": "pdf",
  "downloadUrl": "https://storage.example.com/reports/report-uuid.pdf",
  "createdAt": "2024-01-15T18:00:00.000Z",
  "updatedAt": "2024-01-15T18:00:45.000Z"
}
```

> `status` maps to the `ReportJobStatus` enum: `PROCESSING`, `DONE`, `FAILED`.

---

## 9. Notifications

### GET `/notifications`
Get all `Notification` records for the current user.

**Access:** Protected `[S/A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `unreadOnly` | boolean | Return only unread (default: false) |
| `page` | number | Page number |
| `limit` | number | Records per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "LATE_ALERT",
      "title": "Late Check-In",
      "body": "You checked in 20 minutes late today.",
      "read": false,
      "createdAt": "2024-01-15T09:25:00.000Z"
    }
  ],
  "unreadCount": 3,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

> All notifications are stored in the DB first, then delivered via FCM asynchronously. Delivery is not guaranteed within the same request lifecycle.

---

### PATCH `/notifications/:notificationId/read`
Mark a single notification as read (`read: true`).

**Access:** Protected `[S/A]`

**Response `200`:**
```json
{
  "message": "Notification marked as read"
}
```

---

### PATCH `/notifications/read-all`
Mark all notifications as read for the current user.

**Access:** Protected `[S/A]`

**Response `200`:**
```json
{
  "message": "All notifications marked as read"
}
```

---

### POST `/admin/notifications/send`
Send a manual push notification to students. Stored in the `Notification` table and delivered asynchronously via FCM.

**Access:** Protected `[A]`

**Request Body:**
```json
{
  "title": "Campus Closed Tomorrow",
  "body": "No attendance required tomorrow due to holiday.",
  "targetRole": "STUDENT",
  "targetStudentIds": null
}
```

> Either specify `targetRole` (e.g., `STUDENT`, `ADMIN`) or provide a list of `targetStudentIds`. If both are `null`, the notification is sent to all users.

**Response `201`:**
```json
{
  "message": "Notification sent successfully",
  "notificationId": "uuid",
  "recipientCount": 500,
  "sentAt": "2024-01-15T10:00:00.000Z"
}
```

---

## 10. Fraud Logs

### GET `/admin/fraud-logs`
Get all `FraudLog` records.

**Access:** Protected `[A]`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `studentId` | string | Filter by student |
| `riskLevel` | string | `LOW`, `MEDIUM`, `HIGH` |
| `from` | string | Start date |
| `to` | string | End date |
| `page` | number | Page number |
| `limit` | number | Records per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "name": "John Doe",
        "studentCode": "CS2024001"
      },
      "type": "IMPOSSIBLE_VELOCITY",
      "riskLevel": "HIGH",
      "details": {
        "speedKmh": 320,
        "fromLat": 19.0760,
        "fromLng": 72.8777,
        "toLat": 19.1200,
        "toLng": 72.9000,
        "intervalSeconds": 5
      },
      "createdAt": "2024-01-15T09:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12
  }
}
```

> Fraud detection runs asynchronously after each check-in/check-out event. Each event contributes to a cumulative fraud score. If the score exceeds a configurable threshold, alerts are triggered and optional account restrictions can be applied.

---

### GET `/admin/fraud-logs/:studentId`
Get fraud logs for a specific student.

**Access:** Protected `[A]`

**Response `200`:** Same shape as above, filtered to one student.

---

## 11. System Configuration

### GET `/admin/config`
Get current system configuration (geofence defaults and working hour defaults).

**Access:** Protected `[A]`

**Response `200`:**
```json
{
  "defaultRadiusMeters": 100,
  "defaultMinDurationHours": 6,
  "defaultLateThresholdMins": 15
}
```

---

### PATCH `/admin/config/working-hours/:locationId`
Update the `WorkingHours` record for a location.

**Access:** Protected `[A]`

**Request Body:** (all optional)
```json
{
  "startTime": "09:00",
  "endTime": "17:00",
  "lateThresholdMins": 15,
  "minDurationHours": 6
}
```

**Response `200`:**
```json
{
  "locationId": "uuid",
  "startTime": "09:00",
  "endTime": "17:00",
  "lateThresholdMins": 15,
  "minDurationHours": 6
}
```

---

## 12. System Design Enhancements

### Idempotency

Supported on `POST /attendance/checkin` and `POST /attendance/checkout` via the `Idempotency-Key` request header. Records are persisted in the `IdempotencyRecord` model, keyed by `(key, userId)`. A repeated request with the same key returns the original stored response, preventing duplicate attendance entries due to network retries.

```http
Idempotency-Key: <unique-request-id>
```

---

### Background Job Processing

Heavy operations are enqueued asynchronously using **Redis + BullMQ** so the API returns instantly:

| Job | Trigger |
|-----|---------|
| Fraud detection | After check-in / check-out |
| FCM notification delivery | After notification record is created |
| `DailyStats` update | After check-out |
| Midnight auto-close (absent marking) | Cron at 00:00 |
| CSV / PDF report generation | On `GET /admin/reports/*` with `format=csv\|pdf` |

---

### Caching Layer

Redis is used to cache high-frequency read endpoints:

| Endpoint | Cache TTL |
|----------|-----------|
| `GET /geofence/locations` | 5–10 min |
| `GET /student/dashboard` | 30–60 sec |
| `GET /admin/dashboard` | 30–60 sec |

---

### Eventual Consistency for Analytics

Dashboard and report endpoints use precomputed `DailyStats` aggregates rather than live `COUNT` queries. Stats are updated event-driven on check-out and reconciled nightly by cron. This makes dashboard reads O(1).

---

### Concurrency Control

Critical write operations (`checkin`, `checkout`) use DB transactions with row-level locking to prevent race conditions:

```sql
BEGIN;
SELECT * FROM attendance_logs WHERE studentId=? AND date=? FOR UPDATE;
-- insert or update
COMMIT;
```

---

### Geofence Accuracy Validation

The optional `accuracyMeters` field on check-in/check-out requests carries the GPS accuracy reported by the device. Requests where accuracy exceeds a configurable threshold are rejected to prevent location spoofing. Stored in `checkInAccuracyM` / `checkOutAccuracyM` on `AttendanceLog`.

---

### Device Management

Each student session is bound to a single `deviceId` (stored on `User` and `Session`). The architecture is forward-compatible with multi-device support — future versions will track sessions per device and replace hard blocking with fraud scoring.

---

### Fraud Detection Scoring

Each fraud event type contributes a score:

| Type | Score Contribution |
|------|--------------------|
| `IMPOSSIBLE_VELOCITY` | +50 |
| `LOCATION_JUMP` | +20 |
| `DISTANCE_ANOMALY` | +10 |
| `TIME_ANOMALY` | +15 |
| `DUPLICATE_CHECKIN` | +5 |

If the cumulative score exceeds a configurable threshold, alerts are triggered and optional account restrictions are applied.

---

### Soft Deletes

`deletedAt DateTime?` is present on `User`, `Location`, and `AttendanceLog`. All list and read queries filter `WHERE deletedAt IS NULL`. This prevents permanent data loss and maintains GDPR compliance.

---

### Observability

- **Metrics:** Prometheus
- **Dashboards:** Grafana
- **Logs:** API requests, errors, fraud events

---

## 13. Error Responses

All errors follow a consistent shape:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable description",
  "statusCode": 400
}
```

### Common Error Codes

| HTTP | Error Code | Description |
|------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request body/params failed validation |
| 400 | `ALREADY_CHECKED_IN` | Student already has a check-in for today |
| 400 | `NO_ACTIVE_CHECKIN` | Checkout attempted with no check-in found |
| 400 | `STALE_TIMESTAMP` | Timestamp older than 30 seconds (replay attack) |
| 400 | `LOW_GPS_ACCURACY` | Device GPS accuracy too low; location untrustworthy |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token has expired |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token invalid or revoked |
| 401 | `DEVICE_MISMATCH` | Check-in attempted from a different device than login |
| 401 | `ACCOUNT_SUSPENDED` | User account has been suspended |
| 403 | `FORBIDDEN` | Insufficient role permissions |
| 403 | `OUTSIDE_GEOFENCE` | Location outside allowed radius |
| 404 | `NOT_FOUND` | Resource not found |
| 404 | `LOCATION_NOT_FOUND` | The specified location does not exist |
| 409 | `DUPLICATE_ATTENDANCE` | Attendance record already exists for this date |
| 409 | `DUPLICATE_STUDENT` | Email or studentCode already in use |
| 429 | `RATE_LIMITED` | Too many requests (3 requests/min per student) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Notes

- All timestamps are **ISO 8601 UTC** format.
- All IDs are **UUIDs v4** (`@id @default(uuid())`).
- Attendance check-in requests include a signed `timestamp` — requests older than **30 seconds** are rejected to prevent replay attacks.
- Geofence validation is **always server-side** — client-side pre-checks are UX only.
- Rate limiting: **3 requests/min per student** on attendance endpoints.
- Report exports (`csv`, `pdf`) are processed asynchronously and returned as file downloads via `ReportJob`.

### Device Binding & Security

- **Single-device lock:** Each student's session is bound to one `deviceId` (stored on `User.deviceId` and `Session.deviceId`). Logging in from a different device invalidates the previous `Session` record.
- **DEVICE_MISMATCH error:** If a check-in request comes from a different device than the one used for login, it is rejected.
- **Future:** Multi-device support with per-device `Session` tracking and fraud scoring instead of hard blocking.

### Auto-Close & Absent Record Creation

- **Auto-close:** Every night at midnight, a background worker (BullMQ cron job) closes all `PENDING` attendance records.
  - Records with no check-out are marked `ABSENT`.
  - A `Notification` record is created and pushed to the student.
- **Absent records:** If a student never checks in on a given day, an `ABSENT` record is inserted at midnight.
- **`isAutoClosed` flag:** `true` if the record was closed by the system, `false` if closed by the student.

### Token Expiry & Rotation

- **Access Token TTL:** 15 minutes
- **Refresh Token TTL:** 7 days (stored in `Session.expiresAt`)
- **Token Rotation:** `Session.refreshToken` is single-use. On every refresh the old token is invalidated and a new one issued. Reusing a revoked token triggers invalidation of all sessions for the device.

### Account Suspension & GDPR Compliance

- Use `PATCH /admin/students/:studentId/status` to toggle `User.status` between `ACTIVE` and `SUSPENDED`.
- Suspended accounts retain all `AttendanceLog`, `FraudLog`, and `Notification` records.
- For full account deletion, a separate GDPR data export and anonymisation process is required (not yet documented).

### Fraud Detection Types

| Type | Description | Risk Level |
|------|-------------|-----------|
| `DISTANCE_ANOMALY` | Check-in location is unusually far from the location centre. | MEDIUM |
| `LOCATION_JUMP` | Student moved between two locations impossibly fast. | HIGH |
| `IMPOSSIBLE_VELOCITY` | Calculated travel speed exceeds plausible human velocity (>500 km/h). | HIGH |
| `DUPLICATE_CHECKIN` | Multiple check-ins reported for the same student on the same date. | LOW |
| `TIME_ANOMALY` | Check-out time is before check-in time (clock rewind). | MEDIUM |

### Response Field Conventions

- **Top-level resources** include `createdAt` and `updatedAt` in all responses, except lightweight auth responses.
- **Sensitive fields** (`passwordHash`, `fcmToken`, `deviceId`) are never returned except in `GET /auth/me`.
- **Nested objects** (e.g., `workingHours` inside Location) omit internal fields (`id`, `locationId`, `createdAt`, `updatedAt`).
- **Soft-deleted records** are never returned in list or detail responses.
- All timestamps are **ISO 8601 UTC** format.