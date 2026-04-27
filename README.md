# InDaZone

**Tagline:** Not in Zone, No Attendance.

## Overview

InDaZone is a GPS-based attendance system that allows students to check in and check out only when they are physically inside a defined geofence (default: 100 meters from the premises center).

Attendance is validated by both location and duration:

- Check-in and check-out must happen within the authorized zone.
- Presence duration must be at least 6 hours to be marked as `PRESENT`.
- Attendance below 6 hours is marked as `ABSENT` (invalid for the day).

## Core Objectives

- Improve attendance integrity with server-side geofence enforcement.
- Reduce proxy attendance through continuous validation and anti-fraud checks.
- Maintain reliable daily records for students and administrators.

## Key Rules

- Geofence radius: 100m (configurable per premises).
- Validation source of truth: server-side distance and time calculations.
- Daily attendance: one record per student per day.

## Roadmap

Detailed architecture and phase plan: see [ROADMAP.md](ROADMAP.md).