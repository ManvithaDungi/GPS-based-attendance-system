# InDaZone

**Tagline:** Not in Zone, No Attendance.

---

## Overview

InDaZone is a GPS-based attendance system that allows students to check in and check out only when they are physically inside a defined geofence (default: 100 meters from the premises center).

Attendance is validated using both **location** and **duration**:

- Check-in and check-out must occur within the authorized zone.
- Presence duration must be at least **6 hours** to be marked as `PRESENT`.
- Attendance below 6 hours is marked as `ABSENT` (invalid for the day).

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

- **Today's Status** (Present / Absent / Late / On Leave)
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

Leave Status:          No active leave

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
