
import type { ObjectId } from 'mongodb';
import type { User as AppUser } from './user'; // For AuthUser type reference

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceEntry {
  studentId: string;
  studentName: string; 
  status: AttendanceStatus;
}

export interface AttendanceSubmissionPayload {
  classId: string;
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
  classId: string;
  className: string;
  schoolId: ObjectId | string; 
  date: Date;
  status: AttendanceStatus;
  markedByTeacherId: ObjectId | string; 
  createdAt: Date;
  updatedAt: Date;
}

// Define AuthUser type if not globally available or imported from a central types file
export type AuthUser = Pick<AppUser, 'email' | 'name' | 'role' | '_id' | 'schoolId'>;
