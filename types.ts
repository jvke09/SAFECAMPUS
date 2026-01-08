export enum UserRole {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  DEPARTED = 'DEPARTED'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  schoolId?: string; // For students
  grade?: string;
  section?: string;
  parentId?: string; // For linking
  occupation?: string;
  relationship?: string;
  themePreference?: 'light' | 'dark' | 'system';
}

export interface Classroom {
  id: string;
  name: string;
  grade: string;
  section: string;
  subject?: string;
  room?: string;
  teacherId: string;
  studentIds: string[];
  schedule?: string;
  color: string;
  createdAt: number;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: number; // Unix timestamp
  type: 'LOGIN' | 'LOGOUT';
  synced: boolean;
  location?: { lat: number; lng: number };
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SafeZone {
  id: string;
  name: string;
  center: Coordinates;
  radius: number; // meters
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'INFO' | 'ALERT' | 'SOS' | 'ATTENDANCE';
  read: boolean;
  studentId?: string;
  parentId?: string;
  readAt?: number;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  offlineQueue: AttendanceRecord[];
  isOnline: boolean;
  trackingActive: boolean;
  batterySaverMode: boolean;
}
