# InDaZone — Modules, User Stories & Tasks

---

## System Modules

### 1. Authentication & Authorization
- Student/Admin login & signup
- JWT-based authentication
- Role-based access control (RBAC)

---

### 2. Geofence & Location Engine
- Define geofence (center + radius)
- Distance calculation (Haversine)
- Real-time location validation
- Server-side enforcement

---

### 3. Attendance Management
- Check-in / Check-out system
- Duration tracking
- Status classification (Present, Absent, Late, On Leave)
- Daily record enforcement

---

### 4. Admin Dashboard & Analytics
- Real-time metrics (present, absent, late, on leave)
- Daily / Monthly / Yearly reports
- Student-wise attendance tracking
- Data visualization

---

### 5. Student Dashboard
- Attendance status (today + history)
- Check-in/out UI
- Attendance percentage
- Alerts & notifications

---


### 6. Anti-Fraud & Security
- Impossible movement detection
- Device fingerprinting
- Continuous validation
- Secure API (rate limiting, validation)

---

### 7. Notifications System
- Late alerts
- Absence alerts
- Leave approval notifications

---

### 8. Reports & Export System
- Generate reports (PDF/CSV)
- Filter by date/student
- Download/export functionality

---

### 9. System Configuration
- Set geofence center & radius
- Define working hours / late threshold
- Configure attendance rules

---

## User Stories

### Student

- As a student, I want to **log in securely** so that my data is protected.
- As a student, I want to **check in only within the geofence** so attendance is valid.
- As a student, I want to **check out after my session ends** to complete attendance.
- As a student, I want to **see my attendance status today** so I know if I’m marked present.
- As a student, I want to **view my attendance history** to track my performance.
- As a student, I want to **know if I am late** so I can improve punctuality.
- As a student, I want to **see my attendance percentage** to stay above requirements.

---

### Admin

- As an admin, I want to **view total attendance stats** so I understand daily trends.
- As an admin, I want to **see how many students are on time/late** for discipline tracking.
- As an admin, I want to **view absent counts** for monitoring.
- As an admin, I want to **set the geofence center and radius** for accurate validation.
- As an admin, I want to **view student-wise attendance** for detailed analysis.
- As an admin, I want to **generate reports (daily/monthly/yearly)** for records.
- As an admin, I want to **detect fraud attempts** to maintain system integrity.

---

## Tasks Breakdown (Development)

### Auth Module
- [ ] Design User schema (Student/Admin roles)
- [ ] Implement JWT authentication
- [ ] Password hashing (bcrypt)
- [ ] Middleware for protected routes

---

### Geofence Engine
- [ ] Implement Haversine distance calculation
- [ ] API: Validate user location
- [ ] Store geofence config (DB)
- [ ] Admin UI for setting location

---

### Attendance System
- [ ] Check-in API
- [ ] Check-out API
- [ ] Duration calculation logic
- [ ] Status classification logic
- [ ] Prevent multiple records per day

---

### Admin Dashboard
- [ ] API for daily stats
- [ ] API for reports (daily/monthly/yearly)
- [ ] UI cards for metrics
- [ ] Charts (attendance trends)

---

### Student Dashboard
- [ ] UI for check-in/check-out
- [ ] API for attendance status
- [ ] Attendance history UI
- [ ] Attendance % calculation

---

### Anti-Fraud System
- [ ] Detect impossible movement (speed > threshold)
- [ ] Device fingerprint tracking
- [ ] Background location validation

---

### Notifications
- [ ] Push notifications (Firebase)
- [ ] Alerts for late/absent
- [ ] Leave approval notifications

---

### Reports System
- [ ] Generate CSV/PDF reports
- [ ] Filter by date/user
- [ ] Export functionality

---

### Config Module
- [ ] Set working hours
- [ ] Late threshold config
- [ ] Geofence radius config

---

## Suggested Development Phases

### Phase 1 (MVP)
- Auth + Attendance + Geofence
- Basic Student Dashboard
- Basic Admin Stats

### Phase 2
- Advanced Admin Dashboard
- Reports

### Phase 3
- Anti-Fraud System
- Notifications
- Optimization & scaling

---