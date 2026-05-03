# InDaZone — API Reference

> **Base URL:** `http://localhost:3000/api/v1`
> **Auth:** All protected routes require `Authorization: Bearer <access_token>` header
> **Roles:** `[S]` = Student only · `[A]` = Admin only · `[S/A]` = Both
> **Note:** All endpoint paths shown below are relative to the base URL.

---

## Implementation Status

| Route Group | Mounted Path | Status |
|---|---|---|
| Auth | `/api/v1/auth` | ✅ Implemented |
| Attendance | `/api/v1/attendance` | ✅ Implemented |
| Geofence | `/api/v1/geofence` | ✅ Implemented (read + admin CRUD) |
| Admin | `/api/v1/admin` | ⚠️ Stubs + ✅ Student management implemented |
| Student Dashboard | `/api/v1/student` | ❌ Not mounted |
| Notifications | `/api/v1/notifications` | ❌ Not mounted |
| Fraud Logs | `/api/v1/fraud` | ❌ Not mounted |
| Reports / Config | `/api/v1/admin/reports`, `/api/v1/admin/config` | ❌ Not mounted |

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Authentication](#2-authentication)
3. [Attendance](#3-attendance)
4. [Geofence](#4-geofence)
5. [Admin (Stubs)](#5-admin-stubs)
6. [Middleware Behavior](#6-middleware-behavior)
7. [Error Responses](#7-error-responses)
8. [Not Yet Implemented](#8-not-yet-implemented)

---

## 1. Health Check

### GET `/health`

> **Note:** Full path is `http://localhost:3000/health` (not under `/api/v1`).

**Access:** Public

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-01T09:00:00.000Z"
}
```

---

## 2. Authentication

### POST `/auth/register`

Register a new admin account. Students cannot self-register — they must be created by an admin.

**Access:** Public (restricted to `role: ADMIN` server-side)

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
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
    "createdAt": "2026-05-01T09:00:00.000Z",
    "updatedAt": "2026-05-01T09:00:00.000Z"
  }
}
```

**Response `403` (role is not ADMIN):**
```json
{
  "error": "FORBIDDEN",
  "message": "Only ADMIN role can self-register. Students must be added by an admin."
}
```

**Response `400` (duplicate email):**
```json
{
  "error": "Validation error",
  "details": []
}
```

---

### POST `/auth/login`

Login and receive access + refresh tokens.

**Access:** Public

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "deviceId": "device-admin"
}
```

> For student users, all previous sessions are deleted before a new session is created (single-device enforcement). Sessions are stored in the `Session` model, bound to `userId` and `deviceId`.

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

**Response `401` (invalid credentials):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid email or password"
}
```

**Response `401` (account suspended):**
```json
{
  "error": "ACCOUNT_SUSPENDED",
  "message": "Your account has been suspended. Contact admin for details."
}
```

---

### POST `/auth/refresh`

Rotate a refresh token and receive new tokens.

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

> Refresh tokens are single-use. Each refresh invalidates the previous token and issues a new one. The `Session` record is updated with the new refresh token and a new 7-day expiry.

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Response `401` (invalid or expired token):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired refresh token"
}
```

---

### POST `/auth/logout`

Invalidate the current session by deleting the refresh-token record.

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

Get the current authenticated user's profile.

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

> `deviceId` and `fcmToken` are only returned on this endpoint — never on list or public responses.

---

### PATCH `/auth/me/fcm-token`

Update the FCM push notification token for the current user.

**Access:** Protected `[S/A]`

**Request Body:**
```json
{
  "fcmToken": "new_token_123"
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
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

**Response `200`:**
```json
{
  "message": "Password changed successfully"
}
```

**Response `401` (wrong current password):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Current password is incorrect"
}
```

---

## 3. Attendance

Attendance routes require authentication. Role checks are not currently enforced — any authenticated user may call these handlers.

### POST `/attendance/checkin`

Check in to a location. Validates geofence server-side using the Haversine formula. Supports idempotency to prevent duplicate records on retries.

**Access:** Protected `[S/A]`

**Optional Header:**
```http
Idempotency-Key: <unique-request-id>
```

**Request Body:**
```json
{
  "lat": 19.0760,
  "lng": 72.8777,
  "timestamp": "2026-05-01T09:05:00.000Z",
  "locationId": "uuid",
  "accuracyMeters": 10
}
```

> `timestamp` must not be older than 30 seconds (replay protection). Requests where `accuracyMeters > 100` are rejected. The server computes Haversine distance from the location centre — the client-side check is UX only.

**Response `200`:**
```json
{
  "message": "Check-in successful",
  "attendance": {
    "id": "uuid",
    "locationId": "uuid",
    "date": "2026-05-01",
    "checkInTime": "2026-05-01T09:05:00.000Z",
    "checkInLat": 19.0760,
    "checkInLng": 72.8777,
    "checkInDistanceM": 45.3,
    "checkInAccuracyM": 10,
    "status": "PENDING",
    "punctuality": null
  }
}
```

**Response `400` (stale timestamp):**
```json
{
  "error": "STALE_TIMESTAMP",
  "message": "Timestamp is older than 30 seconds"
}
```

**Response `400` (low GPS accuracy):**
```json
{
  "error": "LOW_GPS_ACCURACY",
  "message": "Device GPS accuracy is too low; location is untrustworthy",
  "statusCode": 400
}
```

**Response `403` (outside geofence):**
```json
{
  "error": "OUTSIDE_GEOFENCE",
  "distanceM": 180.5,
  "allowedRadiusM": 100
}
```

**Response `409` (duplicate same-day check-in):**
```json
{
  "error": "ALREADY_CHECKED_IN"
}
```

---

### POST `/attendance/checkout`

Complete today's attendance record. Calculates duration and sets attendance status and punctuality based on location working hours.

**Access:** Protected `[S/A]`

**Optional Header:**
```http
Idempotency-Key: <unique-request-id>
```

**Request Body:**
```json
{
  "lat": 19.0762,
  "lng": 72.8779,
  "timestamp": "2026-05-01T15:30:00.000Z",
  "locationId": "uuid",
  "accuracyMeters": 12
}
```

> Same timestamp and accuracy rules apply as check-in. Requires an existing same-day check-in record. Sets `status` to `PRESENT`, `LATE`, or `ABSENT` and `punctuality` to `ON_TIME` or `LATE` based on the location's working hours config.

**Response `200`:**
```json
{
  "message": "Check-out successful",
  "attendance": {
    "id": "uuid",
    "locationId": "uuid",
    "date": "2026-05-01",
    "checkInTime": "2026-05-01T09:05:00.000Z",
    "checkInLat": 19.0760,
    "checkInLng": 72.8777,
    "checkInDistanceM": 45.3,
    "checkInAccuracyM": 10,
    "checkOutTime": "2026-05-01T15:30:00.000Z",
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

**Response `409` (duplicate checkout):**
```json
{
  "error": "DUPLICATE_ATTENDANCE"
}
```

---

### GET `/attendance/today`

Get the current user's attendance record for today.

**Access:** Protected `[S/A]`

**Response `200`:**
```json
{
  "id": "uuid",
  "locationId": "uuid",
  "date": "2026-05-01",
  "status": "PRESENT",
  "punctuality": "ON_TIME",
  "checkInTime": "2026-05-01T09:05:00.000Z",
  "checkInLat": 19.0760,
  "checkInLng": 72.8777,
  "checkInAccuracyM": 10,
  "checkOutTime": "2026-05-01T15:30:00.000Z",
  "checkOutLat": 19.0762,
  "checkOutLng": 72.8779,
  "checkOutAccuracyM": 12,
  "durationHours": 6.42,
  "isAutoClosed": false,
  "createdAt": "2026-05-01T09:05:00.000Z",
  "updatedAt": "2026-05-01T15:30:00.000Z"
}
```

**Response `404`:** No attendance record found for today.

---

### GET `/attendance/history`

Get paginated attendance history for the current user. Soft-deleted records are excluded.

**Access:** Protected `[S/A]`

**Query Params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Records per page |
| `from` | string | — | Start date `YYYY-MM-DD` |
| `to` | string | — | End date `YYYY-MM-DD` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "locationId": "uuid",
      "date": "2026-05-01",
      "status": "PRESENT",
      "punctuality": "ON_TIME",
      "checkInTime": "2026-05-01T09:05:00.000Z",
      "checkOutTime": "2026-05-01T15:30:00.000Z",
      "durationHours": 6.42,
      "isAutoClosed": false,
      "createdAt": "2026-05-01T09:05:00.000Z",
      "updatedAt": "2026-05-01T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12
  }
}
```

---

### GET `/attendance/summary`

Get aggregate attendance counts for the current user.

**Access:** Protected `[S/A]`

> Late days are counted as present days for the attendance percentage calculation.

**Response `200`:**
```json
{
  "totalDays": 120,
  "presentDays": 105,
  "absentDays": 10,
  "lateDays": 5,
  "attendancePercentage": 91.67
}
```

---

## 4. Geofence

Geofence routes require authentication. Role checks are not currently enforced.

### GET `/geofence/validate`

Validate whether a coordinate is inside a location's geofence.

**Access:** Protected `[S/A]`

**Query Params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `lat` | float | Yes | Between -90 and 90 |
| `lng` | float | Yes | Between -180 and 180 |
| `locationId` | string | Yes | UUID of the location |
| `accuracyMeters` | float | Yes | Must be `>= 0`; rejected if `> 100` |

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

**Response `400` (invalid params or low accuracy):**
```json
{
  "error": "LOW_GPS_ACCURACY",
  "message": "Device GPS accuracy is too low; location is untrustworthy",
  "statusCode": 400
}
```

---

### GET `/geofence/locations`

List all active locations. Soft-deleted locations are excluded.

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

---

### GET `/geofence/locations/:locationId`

Get a single location's details including working hours.

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

**Response `404`:**
```json
{
  "error": "LOCATION_NOT_FOUND"
}
```

---

## 5. Admin (Stubs)

Admin routes are mounted under `/api/v1/admin` and protected by both `authMiddleware` and `requireRole("ADMIN")`. All handlers below are currently stubs — they return a TODO message and do not query or mutate data.

> A student token will receive `403` on all admin routes.

### GET `/admin/attendance`

**Response `200`:**
```json
{
  "message": "Get all attendance endpoint - TODO: implement"
}
```

---

### GET `/admin/students`

**Response `200`:**
```json
{
  "message": "Get students endpoint - TODO: implement"
}
```

---

### GET `/admin/students/:studentId/attendance`

**Response `200`:**
```json
{
  "message": "Get student attendance endpoint - TODO: implement"
}
```

---

### POST `/admin/premises`

**Response `200`:**
```json
{
  "message": "Create premise endpoint - TODO: implement"
}
```

---

### GET `/admin/premises`

**Response `200`:**
```json
{
  "message": "Get premises endpoint - TODO: implement"
}
```

---

## 6. Middleware Behavior

### Auth Middleware

Applied to all protected routes.

- Reads the bearer token from the `Authorization` header.
- Verifies the JWT with `JWT_SECRET`.
- Loads the user from the database.
- Adds `req.user` with `id`, `email`, `role`, and `status`.
- Returns `401` for a missing token, unknown user, or suspended account.
- Returns `403` for an invalid or tampered token.

### RBAC Middleware

Applied to admin routes (`requireRole("ADMIN")`).

- Checks `req.user.role` against the allowed role list.
- Returns `403` if the role does not match.

### Idempotency Middleware

Applied to `POST /attendance/checkin` and `POST /attendance/checkout`.

- Only active when the `Idempotency-Key` request header is present.
- Stores a hash of the request body keyed by `(key, userId)`.
- Replays the stored successful response for a duplicate identical request.
- Returns `400` if the same key is reused with a different request payload.
- Returns `409` if a request with the same key is still in-flight.
- Deletes failed idempotency records so failed requests can be retried cleanly.

```http
Idempotency-Key: <unique-request-id>
```

---

## 7. Error Responses

Error response shapes are not yet fully standardised across all controllers. The following shapes currently exist in the codebase:

```json
{ "error": "UNAUTHORIZED", "message": "No token provided" }
```
```json
{ "error": "Validation error", "details": [] }
```
```json
{ "error": "OUTSIDE_GEOFENCE" }
```
```json
{ "error": "LOW_GPS_ACCURACY", "message": "Device GPS accuracy is too low; location is untrustworthy", "statusCode": 400 }
```

### Common Error Codes

| HTTP | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or params failed Zod validation |
| 400 | `STALE_TIMESTAMP` | Timestamp is older than 30 seconds (replay protection) |
| 400 | `LOW_GPS_ACCURACY` | Device GPS accuracy exceeds the 100 m threshold |
| 409 | `ALREADY_CHECKED_IN` | A check-in already exists for today |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `ACCOUNT_SUSPENDED` | User account has been suspended |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token is invalid or expired |
| 403 | `FORBIDDEN` | Insufficient role permissions |
| 403 | `OUTSIDE_GEOFENCE` | Coordinates are outside the allowed radius |
| 404 | `NOT_FOUND` | Resource not found |
| 404 | `LOCATION_NOT_FOUND` | The specified location does not exist |
| 409 | `DUPLICATE_ATTENDANCE` | Attendance record already exists for this date |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 8. Not Yet Implemented

The following endpoints are referenced in tests or the API specification but are not mounted in the current backend.

| Method | Path | Notes |
|---|---|---|
| POST | `/admin/students` | Test allows 404/501 |
| PATCH | `/admin/students/:id/status` | Test allows 404/501 |
| GET | `/student/dashboard` | Route group not mounted |
| GET | `/notifications` | Route group not mounted |
| PATCH | `/notifications/:id/read` | Route group not mounted |
| GET | `/fraud` | Route group not mounted |
| POST | `/geofence/locations` | Test allows 404 |
| PUT | `/geofence/locations/:id` | Test allows 404 |
| DELETE | `/geofence/locations/:id` | Test allows 404 |

Additional capabilities planned in the full specification but not yet present:

- Admin dashboard aggregates (`GET /admin/dashboard`)
- Admin location management (`POST /admin/locations`, `PATCH`, `DELETE`)
- Student management (`POST /admin/students`, `PATCH /admin/students/:id/status`, bulk import)
- Notifications (`GET /notifications`, `PATCH /notifications/:id/read`, admin send)
- Fraud logs (`GET /admin/fraud-logs`)
- Reports and export (`GET /admin/reports/daily|monthly|yearly`)
- System configuration (`GET /admin/config`, `PATCH /admin/config/working-hours/:locationId`)
- Redis caching on geofence and dashboard endpoints
- BullMQ background jobs (fraud detection, FCM delivery, daily stats, auto-close cron)
- Rate limiting on attendance endpoints (limiter is declared but not applied)
- Device mismatch enforcement during check-in/check-out

---

## Notes

- All timestamps are **ISO 8601 UTC**.
- All IDs are **UUID v4**.
- Geofence validation is **always server-side** — client pre-checks are UX only.
- Soft-deleted records (`deletedAt IS NOT NULL`) are excluded from all list and detail responses.
- **Access Token TTL:** 15 minutes · **Refresh Token TTL:** 7 days