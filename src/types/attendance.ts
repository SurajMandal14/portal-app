
import type { ObjectId } from 'mongodb';
import type { AuthUser as CentralAuthUser } from './user'; // Import central AuthUser

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

export interface AttendanceSubmissionPayload {
  classId: string; // This should ideally be a unique ID, but currently using class name
  className: string;
  schoolId: string;
  date: Date;
  entries: AttendanceEntry[];
  markedByTeacherId: string;
}

export interface AttendanceRecord {
  _id: ObjectId | string;
  studentId: string;
  studentName: string;
  classId: string; // Stores class name
  className: string;
  schoolId: ObjectId | string;
  date: Date;
  status: AttendanceStatus;
  markedByTeacherId: ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

// Use the centrally defined AuthUser
export type AuthUser = CentralAuthUser;
