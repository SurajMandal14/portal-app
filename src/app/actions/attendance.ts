
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { AttendanceRecord, AttendanceSubmissionPayload, AttendanceStatus, DailyAttendanceOverview } from '@/types/attendance';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import type { User } from '@/types/user';

const attendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  status: z.enum(['present', 'absent', 'late']),
});

const attendanceSubmissionPayloadSchema = z.object({
  classId: z.string().min(1),
  className: z.string().min(1),
  schoolId: z.string().min(1),
  date: z.date(),
  entries: z.array(attendanceEntrySchema).min(1, "At least one student entry is required."),
  markedByTeacherId: z.string().min(1),
});

export interface SubmitAttendanceResult {
  success: boolean;
  message: string;
  error?: string;
  count?: number;
}

export async function submitAttendance(payload: AttendanceSubmissionPayload): Promise<SubmitAttendanceResult> {
  try {
    const validatedPayload = attendanceSubmissionPayloadSchema.safeParse(payload);
    if (!validatedPayload.success) {
      const errors = validatedPayload.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid payload!' };
    }

    const { classId, className, schoolId, date, entries, markedByTeacherId } = validatedPayload.data;

    const { db } = await connectToDatabase();
    const attendanceCollection = db.collection<Omit<AttendanceRecord, '_id'>>('attendances');

    const recordsToInsert: Omit<AttendanceRecord, '_id'>[] = entries.map(entry => ({
      studentId: entry.studentId,
      studentName: entry.studentName,
      classId,
      className,
      schoolId: new ObjectId(schoolId),
      date: new Date(date.setHours(0, 0, 0, 0)), // Normalize date to midnight UTC
      status: entry.status as AttendanceStatus,
      markedByTeacherId: new ObjectId(markedByTeacherId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Optional: Delete existing records for this classId, schoolId, and date to prevent duplicates if resubmitting
    await attendanceCollection.deleteMany({
      classId,
      schoolId: new ObjectId(schoolId),
      date: new Date(date.setHours(0, 0, 0, 0)),
    });

    const result = await attendanceCollection.insertMany(recordsToInsert);

    if (result.insertedCount === 0 && recordsToInsert.length > 0) {
      return { success: false, message: 'Failed to save attendance records.', error: 'Database insertion failed.' };
    }
    
    revalidatePath('/dashboard/teacher/attendance');
    revalidatePath('/dashboard/admin/attendance');
    revalidatePath('/dashboard/student/attendance');


    return {
      success: true,
      message: `Successfully submitted attendance for ${result.insertedCount} students.`,
      count: result.insertedCount,
    };

  } catch (error) {
    console.error('Submit attendance server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during attendance submission.', error: errorMessage };
  }
}

export interface GetAttendanceRecordsResult {
  success: boolean;
  records?: AttendanceRecord[];
  error?: string;
  message?: string;
}

export async function getDailyAttendanceForSchool(schoolId: string, date: Date): Promise<GetAttendanceRecordsResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.'};
    }

    const { db } = await connectToDatabase();
    const attendanceCollection = db.collection<AttendanceRecord>('attendances');
    
    const targetDate = new Date(date);
    targetDate.setUTCHours(0,0,0,0);

    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate);
    endDate.setDate(startDate.getDate() + 1);
    
    const records = await attendanceCollection.find({
      schoolId: new ObjectId(schoolId) as any, 
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    }).sort({ className: 1, studentName: 1 }).toArray();
    
    const recordsWithStrId = records.map(record => ({
      ...record,
      _id: record._id.toString(),
      schoolId: record.schoolId.toString(),
      markedByTeacherId: record.markedByTeacherId.toString(),
    }));

    return { success: true, records: recordsWithStrId };
  } catch (error) {
    console.error('Get daily attendance server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch attendance records.' };
  }
}

export async function getStudentAttendanceRecords(studentId: string, schoolId: string): Promise<GetAttendanceRecordsResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(studentId)) {
        return { success: false, message: 'Invalid Student ID or School ID format.', error: 'Invalid ID format.'};
    }

    const { db } = await connectToDatabase();
    const attendanceCollection = db.collection<AttendanceRecord>('attendances');
    
    const records = await attendanceCollection.find({
      studentId: studentId, 
      schoolId: new ObjectId(schoolId) as any,
    }).sort({ date: -1 }).toArray();
    
    const recordsWithStrId = records.map(record => ({
      ...record,
      _id: record._id.toString(),
      schoolId: record.schoolId.toString(),
      markedByTeacherId: record.markedByTeacherId.toString(),
    }));

    return { success: true, records: recordsWithStrId };
  } catch (error) {
    console.error('Get student attendance records server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch student attendance records.' };
  }
}


export interface GetDailyAttendanceOverviewResult {
    success: boolean;
    summary?: DailyAttendanceOverview;
    error?: string;
    message?: string;
}

export async function getDailyAttendanceOverviewForSchool(schoolId: string, date: Date): Promise<GetDailyAttendanceOverviewResult> {
    try {
        if (!ObjectId.isValid(schoolId)) {
            return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.' };
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection<User>('users');
        const attendanceCollection = db.collection<AttendanceRecord>('attendances');

        const totalStudents = await usersCollection.countDocuments({
            schoolId: new ObjectId(schoolId) as any,
            role: 'student'
        });

        if (totalStudents === 0) {
            return { success: true, summary: { totalStudents: 0, present: 0, absent: 0, late: 0, percentage: 0 } };
        }
        
        const targetDate = new Date(date);
        targetDate.setUTCHours(0,0,0,0);
        const startDate = new Date(targetDate);
        const endDate = new Date(targetDate);
        endDate.setDate(startDate.getDate() + 1);

        const attendanceRecords = await attendanceCollection.find({
            schoolId: new ObjectId(schoolId) as any,
            date: { $gte: startDate, $lt: endDate },
        }).toArray();

        let present = 0;
        let late = 0;
        const attendedStudentIds = new Set<string>();

        attendanceRecords.forEach(record => {
            if (record.status === 'present') {
                present++;
                attendedStudentIds.add(record.studentId.toString());
            } else if (record.status === 'late') {
                late++;
                attendedStudentIds.add(record.studentId.toString());
            }
        });
        
        // To accurately calculate absent, we need all student IDs of the school
        const schoolStudents = await usersCollection.find({ schoolId: new ObjectId(schoolId) as any, role: 'student' }).project({ _id: 1 }).toArray();
        const totalStudentCountForSchool = schoolStudents.length;

        // Students who have an attendance record (present or late)
        const markedPresentOrLate = present + late;
        
        // Students explicitly marked absent
        const markedAbsent = attendanceRecords.filter(r => r.status === 'absent').length;

        // Students with no attendance record for the day are considered absent.
        // This is total students minus those explicitly marked present or late.
        // This count should be accurate if attendance is marked for all students.
        // If only some classes mark attendance, this could be misleading.
        // A better approach might be to sum up present + late and then totalStudents - (present+late) for absence
        // assuming totalStudents is accurate for the day.

        const calculatedAbsent = totalStudentCountForSchool - markedPresentOrLate;
        const absent = calculatedAbsent < 0 ? 0 : calculatedAbsent; // ensure absent is not negative

        const percentage = totalStudentCountForSchool > 0 ? Math.round(((present + late) / totalStudentCountForSchool) * 100) : 0;

        return { 
            success: true, 
            summary: { 
                totalStudents: totalStudentCountForSchool, 
                present, 
                absent, 
                late, 
                percentage 
            } 
        };

    } catch (error) {
        console.error('Get daily attendance overview error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage, message: 'Failed to fetch daily attendance overview.' };
    }
}
