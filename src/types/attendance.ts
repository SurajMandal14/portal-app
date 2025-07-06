
import type { ObjectId } from 'mongodb';
import type { AuthUser as CentralAuthUser } from './user'; // Import central AuthUser

// New Monthly Attendance Types
export interface MonthlyAttendanceEntry {
  studentId: string;
  studentName: string;
  daysPresent: number | null;
}

export interface MonthlyAttendanceSubmissionPayload {
  classId: string;
  schoolId: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  entries: MonthlyAttendanceEntry[];
  markedByTeacherId: string;
}

export interface MonthlyAttendanceRecord {
  _id: ObjectId | string;
  studentId: ObjectId | string;
  studentName?: string;
  classId: ObjectId | string;
  className?: string; // For display on admin page
  schoolId: ObjectId | string;
  month: number; // 0-11
  year: number;
  daysPresent: number;
  totalWorkingDays: number;
  markedByTeacherId?: ObjectId | string;
  markedByTeacherName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}


// This remains the same, used for session data
export type AuthUser = CentralAuthUser;
