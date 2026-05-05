# InDaZone Web Admin Portal

React/Vite admin dashboard for the GPS-based attendance system. The app is an authenticated admin portal for viewing attendance, geofence premises, and fraud/security logs.

## Tech Stack

- React 19 + TypeScript
- Vite 6 with an Express development wrapper
- React Router
- Axios API client
- Tailwind CSS 4
- Lucide React icons
- React Leaflet / Leaflet for geofence maps

## Run Locally

**Prerequisites:** Node.js and a running InDaZone backend API.

```bash
npm install
npm run dev
```

The development server runs at:

```text
http://localhost:5173
```

## Environment

The Axios client in `src/lib/api.ts` uses:

```text
VITE_API_URL=http://localhost:3000/api/v1
```

The backend routes are mounted under `/api/v1`, so the web app should point `VITE_API_URL` to that base URL. Vite only exposes browser environment variables that start with `VITE_`.

## Authentication

Protected pages require `localStorage.accessToken`. Admin-only UI also stores `localStorage.userRole` after login. The shared API client automatically sends:

```http
Authorization: Bearer <accessToken>
```

On a `401` response, the client tries `POST /auth/refresh` with `localStorage.refreshToken`, stores the rotated tokens, and retries the failed request once. If refresh fails, it clears `accessToken`, `refreshToken`, and `userRole`, then redirects to `/login`.

The app throws at startup if `VITE_API_URL` is not defined. The UI also stores the theme preference in `localStorage.theme`.

## Pages And Features

### `/login` - Login

- Admin login screen with email and password fields.
- Sends the required backend `deviceId` field as `web-admin-${navigator.userAgent}`.
- Requires the returned user role to be `ADMIN`.
- Stores `response.data.accessToken`, `response.data.refreshToken`, and `response.data.user.role` in local storage.
- Redirects to `/` after a successful login.
- Shows backend error messages when login fails.

Required API:

```http
POST /auth/login
```

Expected request from the current web page:

```json
{
  "email": "admin@indazone.com",
  "password": "password123",
  "deviceId": "web-admin-<browser user agent>"
}
```

Expected response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### `/` - Dashboard Overview

- Protected admin dashboard landing page.
- Summary cards for total students, present today, absent today, and late today.
- Profile greeting from the authenticated user's `/auth/me` response.
- Attendance summary ring and counts from `/attendance/summary`.
- Active premises count from `/admin/dashboard.totalLocations`.

Required APIs:

```http
GET /admin/dashboard
GET /attendance/summary
GET /auth/me
```

Expected response:

```json
{
  "totalStudents": 1240,
  "presentToday": 1150,
  "lateToday": 12,
  "totalLocations": 3
}
```

The page safely defaults missing numeric values to `0` and calculates `absentToday` as `(totalStudents ?? 0) - (presentToday ?? 0)`.

There is no trend endpoint in the backend, so the dashboard does not render an attendance trend chart.

### `/attendance` - Attendance Logs

- Protected attendance table for student check-in/check-out records.
- Displays student name, roll number, attendance status, punctuality, check-in time, check-out time, and duration.
- Maps student fields from `row.student.name` and `row.student.studentCode`.
- Safely handles missing attendance arrays and missing check-in/check-out values.
- Uses backend pagination with `page` and `limit` query params.
- Search is local to the current fetched page because the backend does not expose search/filter query params for this endpoint.
- Loading skeletons while data is fetched.

Required API:

```http
GET /admin/attendance?page=1&limit=20
```

Expected response:

```json
{
  "data": [
    {
      "id": "uuid",
      "student": {
        "name": "Student Name",
        "studentCode": "CS2024001"
      },
      "status": "PRESENT",
      "punctuality": "ON_TIME",
      "checkInTime": "2026-05-05T09:05:00.000Z",
      "checkOutTime": "2026-05-05T15:30:00.000Z",
      "durationHours": 6.42,
      "date": "2026-05-05T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

### `/premises` - Manage Premises

- Protected premises/geofence management view.
- Lists active geofence locations.
- Shows selected premise latitude, longitude, and radius.
- Displays all premises on a Leaflet/OpenStreetMap map with markers and geofence circles.

Required API:

```http
GET /geofence/locations
```

Expected response:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "College Campus",
      "latitude": 19.076,
      "longitude": 72.8777,
      "radiusMeters": 100
    }
  ]
}
```

Working hours and late thresholds are not shown on this page because `/geofence/locations` does not return those fields.

### `/logs` - Security And Fraud Logs

- Protected fraud/security review page.
- Fetches fraud logs only when `localStorage.userRole` is `ADMIN`; the backend also enforces admin-only access.
- Lists suspicious attendance verification events.
- Expands a log row to show raw metadata/details.
- Displays risk badges and icons for location, device, and biometric-style events.
- Uses backend pagination with `page` and `limit` query params.
- Search, risk filtering, and type filtering are local to the current fetched page because the backend does not expose filter query params.

Required API:

```http
GET /fraud?page=1&limit=20
```

Expected response:

```json
{
  "data": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "name": "Student Name",
        "email": "student@example.com",
        "studentCode": "CS2024001"
      },
      "type": "Location Spoofing",
      "riskLevel": "HIGH",
      "details": {
        "distanceM": 500,
        "allowedRadiusM": 100
      },
      "createdAt": "2026-05-05T09:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

## Shared Layout Features

- `Sidebar` renders the main navigation: Overview, Attendance, Premises, and Logs.
- `Sidebar` logout removes `accessToken`, `refreshToken`, and `userRole`, then redirects to `/login`.
- `TopBar` includes a global search input, theme toggle, notification/settings buttons, and profile information from `/auth/me`.
- `ProtectedRoute` wraps all authenticated pages with the sidebar/topbar layout and requires `userRole === "ADMIN"`.

## API Summary

All protected API calls require an admin access token.

| Page | Method | Endpoint | Purpose |
|---|---:|---|---|
| Login | `POST` | `/auth/login` | Sign in and receive tokens |
| Auth Refresh | `POST` | `/auth/refresh` | Rotate refresh token after a `401` |
| Overview | `GET` | `/admin/dashboard` | Dashboard counts |
| Overview | `GET` | `/attendance/summary` | Signed-in account attendance summary |
| Overview/Layout | `GET` | `/auth/me` | Signed-in user profile |
| Attendance | `GET` | `/admin/attendance` | Paginated attendance logs |
| Premises | `GET` | `/geofence/locations` | Active geofence locations |
| Logs | `GET` | `/fraud` | Paginated fraud/security logs |

## Known Integration Gaps

- `/admin/attendance` does not currently support backend search, date filters, status filters, or sorting; the web app only filters the current page locally.
- `/fraud` does not currently support backend search, risk filters, type filters, or sorting; the web app only filters the current page locally.
- `/geofence/locations` does not return working hours or late thresholds. Use `/admin/config` or `/geofence/locations/:locationId` if that data needs to return to the premises UI.
- There is no dashboard trend endpoint, so no attendance trend chart is rendered.
