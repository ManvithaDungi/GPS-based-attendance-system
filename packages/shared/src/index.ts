/**
 * Shared types and enums for InDaZone application
 * Used across mobile and backend applications
 */

// Enums
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  PENDING = 'PENDING',
}

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

// Interfaces

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Premise {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  premiseId: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationHours: number | null;
  status: AttendanceStatus;
  date: string;
  createdAt: string;
}

export interface AttendanceSummary {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  pendingCount: number;
  totalRecords: number;
}

export interface CheckInPayload {
  premiseId: string;
  latitude: number;
  longitude: number;
  checkInTime?: string;
}

export interface CheckOutPayload {
  premiseId: string;
  checkOutTime?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface NearbyPremise extends Premise {
  distanceMeters: number;
  isWithinGeofence: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
