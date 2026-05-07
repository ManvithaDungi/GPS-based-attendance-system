# InDaZone Mobile App - Complete Feature And API Report

React Native + Expo mobile client for the GPS-based attendance platform. This app contains student-facing attendance workflows and a small set of admin mobile screens.

## Tech Stack

- Expo 55 + React Native 0.83 + React 19
- TypeScript
- React Navigation (native stack + bottom tabs)
- Axios for API access
- `expo-location` and native/web geolocation APIs
- Async token storage via `StorageService`

## Run Locally

Prerequisites: Node.js 20+ and a running backend API.

```bash
npm install
npm run start
```

Useful variants:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Runtime Architecture

- `App.tsx` (root) loads `src/App.tsx`, which wraps:
  - `SafeAreaProvider`
  - `AuthProvider`
  - `ThemeProvider`
  - `ErrorBoundary`
- Root stack switches between:
  - `Login`
  - `MainLayout` (authenticated)
- `MainLayout` bottom tabs:
  - `Home`
  - `Attendance`
  - `Notifications`
  - `Profile`

## Feature Inventory

### Authentication

- Login with email/password + device identifier
- Access/refresh token session management
- Auto refresh on `401` and request replay
- Forced logout + token cleanup on refresh failure
- Manual logout flow with confirm modal

### Home (Student)

- Live geofence-aware attendance dashboard
- Fetches geofence list and selects nearest/fallback location
- Fetches today's attendance state
- Tracks current device location (web/native)
- Validates in/out geofence status and distance
- Check-in / check-out actions with GPS coordinates and accuracy
- Active-session countdown timer based on `minDurationHours`
- Map interaction toggle and geofence visualization

### Attendance (Student)

- Attendance history list mode
- Attendance calendar mode with day drill-down
- Summary cards (present/absent/late/percentage normalization)
- Check-in/check-out timestamps and duration display

### Notifications (Student)

- Polls notifications every 5 seconds
- Unread count badge
- Mark single notification read
- Mark all notifications read in batch
- Retry UI and empty-state UX

### Profile (Student)

- Fetch authenticated profile details
- Theme toggle (light/dark)
- Account info card (student code, status, joined date)
- Sign-out confirmation modal

### Admin Mobile Screens (Present In Folder)

These screens exist in `src/screens/admin` and call backend APIs, but are not currently wired into the main app navigation flow.

- `AdminDashboardScreen`
  - Dashboard metrics cards
- `StudentsScreen`
  - Student list retrieval
  - Active/suspended status toggling

## Shared Hooks And Services

- `src/services/api.ts`
  - Resolves base URL from Expo config + platform defaults
  - Attaches `Authorization: Bearer <token>`
  - Refreshes token through `/auth/refresh` on `401`
  - Emits `auth:logout` event when refresh fails
- `src/context/AuthContext.tsx`
  - Login persistence
  - Logout endpoint call + storage cleanup
  - Explicit refresh action
- `src/hooks/useAttendance.ts`
  - Today status fetch + check-in/check-out helpers
- `src/hooks/useLocation.ts`
  - Foreground location watch
  - Server-side geofence validation, fallback local distance check

## Complete API Call Matrix

All paths are relative to API base URL (for example `/api/v1`).

| Area | Method | Endpoint | Called From |
|---|---|---|---|
| Auth | `POST` | `/auth/login` | `screens/auth/LoginScreen.tsx` |
| Auth | `POST` | `/auth/logout` | `context/AuthContext.tsx` |
| Auth | `POST` | `/auth/refresh` | `services/api.ts`, `context/AuthContext.tsx` |
| Auth/Profile | `GET` | `/auth/me` | `screens/student/ProfileScreen.tsx` |
| Geofence | `GET` | `/geofence/locations` | `screens/student/HomeScreen.tsx`, `hooks/useLocation.ts` |
| Geofence | `GET` | `/geofence/validate` | `hooks/useLocation.ts` |
| Attendance | `GET` | `/attendance/today` | `screens/student/HomeScreen.tsx`, `hooks/useAttendance.ts` |
| Attendance | `POST` | `/attendance/checkin` | `hooks/useAttendance.ts` |
| Attendance | `POST` | `/attendance/checkout` | `hooks/useAttendance.ts` |
| Attendance | `GET` | `/attendance/history` | `screens/student/HistoryScreen.tsx` |
| Attendance | `GET` | `/attendance/history?page=1&limit=30` | `screens/student/AttendanceScreen.tsx` |
| Attendance | `GET` | `/attendance/summary` | `screens/student/AttendanceScreen.tsx` |
| Notifications | `GET` | `/notifications` | `screens/student/NotificationsScreen.tsx` |
| Notifications | `PATCH` | `/notifications/:id/read` | `screens/student/NotificationsScreen.tsx` |
| Admin | `GET` | `/admin/dashboard` | `screens/admin/AdminDashboardScreen.tsx` |
| Admin | `GET` | `/admin/students` | `screens/admin/StudentsScreen.tsx` |
| Admin | `PATCH` | `/admin/students/:id/status` | `screens/admin/StudentsScreen.tsx` |

## API Data Expectations (High Level)

- Auth login returns: `accessToken`, `refreshToken`, `user`
- `/attendance/today` may return `null` or current-day attendance object
- `/attendance/history` returns list or paginated `data` array (screen code normalizes)
- `/attendance/summary` supports multiple key styles (`presentDays` / `present_days` / `totalPresent`)
- `/notifications` expected shape: `{ data: Notification[] }`
- `/geofence/validate` expected keys: `isWithinGeofence`, `distanceM`, `allowedRadiusM`

## Environment And Base URL Behavior

`src/services/api.ts` chooses URL in this order:

- `expo.extra.apiUrl` if provided and valid
- Android dev fallback: `http://10.0.2.2:3000/api/v1`
- Other dev fallback: `http://localhost:3000/api/v1`
- Production fallback: `https://gps-attendance-api.onrender.com/api/v1`

## Notes

- `src/screens/student/HistoryScreen.tsx` exists separately from tab-based `AttendanceScreen` and is currently not tab-routed.
- Mobile relies on backend geofence enforcement; local distance checks are used for UX fallback.

