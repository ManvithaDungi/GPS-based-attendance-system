# InDaZone Web Admin Portal - Complete Feature And API Report

React + Vite admin dashboard for the GPS attendance platform. This app is restricted to `ADMIN` users and covers attendance monitoring, student operations, geofence premise management, and fraud/security logs.

## Tech Stack

- React 19 + TypeScript
- Vite 6 + React Router
- Axios API client with refresh-token interceptor
- Tailwind CSS 4
- Leaflet / React-Leaflet map rendering
- Lucide icons

## Run Locally

Prerequisites: Node.js and a running InDaZone backend API.

```bash
npm install
npm run dev
```

Default dev URL:

```text
http://localhost:5173
```

## Environment

Set the API base URL:

```text
VITE_API_URL=http://localhost:3000/api/v1
```

`src/lib/api.ts` throws at startup if `VITE_API_URL` is missing.

## Authentication And Session Model

- Login stores:
  - `localStorage.accessToken` (access token JWT)
  - `localStorage.userRole` (user role for UI gating)
  - Note: the refresh token is issued by the API and is sent as an HttpOnly cookie by default; the web client does not persist the refresh token in `localStorage`.
- All protected pages are wrapped by `ProtectedRoute` and require:
  - token present
  - `userRole === "ADMIN"`
- Axios interceptor behavior:
  - on `401`, calls `POST /auth/refresh`
  - rotates local tokens
  - retries the failed request once
  - on refresh failure, clears auth storage and redirects to `/login`

### CSRF / Refresh notes

- The backend may issue the refresh token as an HttpOnly cookie and additionally set a readable `refreshCsrf` cookie. Browser clients must follow the double-submit pattern: read the `refreshCsrf` cookie and include the same value in the `x-csrf-token` header when calling `/auth/refresh` or `/auth/logout`.
- The web client already reads `refreshCsrf` and attaches it to refresh/logout requests automatically. Non-browser clients (mobile) may send `{ refreshToken }` in the request body instead.

## Route-Level Feature Report

### `/login` - Admin Auth

- Email/password sign-in UI
- Device ID: a persisted `deviceId` stored in `localStorage` (generated via `crypto.randomUUID()` on first use) is sent with login requests as `deviceId`.
- Role gate: non-admin users are blocked even with valid credentials
- Token/userRole persistence in local storage
- Includes registration flow (`/auth/register`) for admin onboarding path from the page UI

### `/` - Overview Dashboard

- KPI cards:
  - total students
  - present today
  - absent today (derived)
  - late today
  - active locations
- Current profile greeting and metadata from `/auth/me`
- Day-specific attendance pull for trend widgets via `/admin/attendance?from=...&to=...&limit=1000`
- Handles partial/missing payload keys with safe defaults

### `/attendance` - Attendance Monitoring

- Paginated attendance records table
- Status + punctuality badges
- Student identity (name + student code)
- Check-in/check-out timestamps
- Duration rendering
- Query-based pagination to backend
- Local UI search/filtering layered on fetched page

### `/students` - Student Management

- Paginated student directory with backend query params
- Search form support (`search` query)
- Single student creation form
- Bulk JSON upload flow (loops over entries and calls create endpoint per student)
- Student status toggling (ACTIVE/SUSPENDED)
- Success/error banners for registration/upload

### `/premises` - Geofence Premises Management

- Geofence premises list + detail panel
- Interactive Leaflet map with markers + radius circles
- Select premise and inspect coordinates/radius
- Add premise modal
- Edit premise modal
- Delete premise confirm modal
- Form validation for lat/lng/radius prior to API call

### `/logs` - Fraud / Security Events

- Paginated fraud log table
- Risk-level UI chips/icons
- Event detail expansion
- Local filtering/searching on current page data
- Admin-only guarded fetch

## Shared Layout Features

- `Sidebar`
  - Navigation: Overview, Attendance, Students, Premises, Logs
  - Logout clears tokens and role
- `TopBar`
  - Search UI shell
  - Theme toggle persistence (`localStorage.theme`)
  - Fetches current admin profile from `/auth/me`
- `ErrorBoundary`
  - Catches render crashes and shows fallback recovery UI

## Complete API Call Matrix

All endpoints are relative to `VITE_API_URL` base.

| Area | Method | Endpoint | Called From |
|---|---|---|---|
| Auth | `POST` | `/auth/login` | `pages/Login.tsx` |
| Auth | `POST` | `/auth/register` | `pages/Login.tsx` |
| Auth | `POST` | `/auth/refresh` | `lib/api.ts` interceptor |
| Auth/Profile | `GET` | `/auth/me` | `pages/Overview.tsx`, `components/layout/TopBar.tsx` |
| Dashboard | `GET` | `/admin/dashboard` | `pages/Overview.tsx` |
| Attendance | `GET` | `/admin/attendance` | `pages/Attendance.tsx` |
| Attendance (day drill) | `GET` | `/admin/attendance?from=<date>&to=<date>&limit=1000` | `pages/Overview.tsx` |
| Students | `GET` | `/admin/students?page=<n>&limit=<n>&search=<term>` | `pages/Students.tsx` |
| Students | `POST` | `/admin/students` | `pages/Students.tsx` |
| Students | `PATCH` | `/admin/students/:id/status` | `pages/Students.tsx` |
| Geofence | `GET` | `/geofence/locations` | `pages/Premises.tsx` |
| Geofence | `POST` | `/geofence/locations` | `pages/Premises.tsx` |
| Geofence | `PUT` | `/geofence/locations/:id` | `pages/Premises.tsx` |
| Geofence | `DELETE` | `/geofence/locations/:id` | `pages/Premises.tsx` |
| Fraud | `GET` | `/fraud?page=<n>&limit=<n>` | `pages/Logs.tsx` |

## Data Contracts Expected By UI

- `/auth/login`: expects `accessToken`, `refreshToken`, `user.role`
- `/admin/dashboard`: expects counts like `totalStudents`, `presentToday`, `lateToday`, `totalLocations`
- `/admin/attendance`: expects paginated shape or list fallback, with nested `student`
- `/admin/students`: accepts multiple response envelopes; page normalizes shape
- `/geofence/locations`: expects array with `id`, `name`, `latitude`, `longitude`, `radiusMeters`
- `/fraud`: expects list entries containing event type, risk level, student details, and timestamps

## Current Behavioral Notes

- Several pages intentionally normalize multiple backend response shapes; this increases resilience to API envelope differences.
- Student bulk upload is client-driven fan-out (one `POST` per record), not a dedicated backend bulk endpoint.
- Search/filter controls on attendance and logs are primarily client-side on fetched pages unless backend query support is present.
