
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { MarkEntry, MarksSubmissionPayload, SubmitMarksResult, GetMarksResult } from '@/types/marks';
import { marksSubmissionPayloadSchema } from '@/types/marks';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

export async function submitMarks(payload: MarksSubmissionPayload): Promise<SubmitMarksResult> {
  try {
    const validatedPayload = marksSubmissionPayloadSchema.safeParse(payload);
    if (!validatedPayload.success) {
      const errors = validatedPayload.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { success: false, message: 'Validation failed.', error: errors };
    }

    const {
      classId, className, subjectId, subjectName, assessmentName, term,
      academicYear, markedByTeacherId, schoolId, studentMarks
    } = validatedPayload.data;

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<Omit<MarkEntry, '_id'>>('marks');

    const marksToUpsert: Omit<MarkEntry, '_id'>[] = studentMarks.map(sm => ({
      studentId: new ObjectId(sm.studentId),
      studentName: sm.studentName,
      classId: classId, // Assuming classId from payload is the ID
      className: className,
      subjectId: subjectId,
      subjectName: subjectName,
      assessmentName: assessmentName,
      term: term,
      academicYear: academicYear,
      marksObtained: sm.marksObtained,
      maxMarks: sm.maxMarks,
      markedByTeacherId: new ObjectId(markedByTeacherId),
      schoolId: new ObjectId(schoolId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const operations = marksToUpsert.map(mark => ({
      updateOne: {
        filter: {
          studentId: mark.studentId,
          classId: mark.classId,
          subjectId: mark.subjectId,
          assessmentName: mark.assessmentName,
          term: mark.term,
          academicYear: mark.academicYear,
          schoolId: mark.schoolId,
        },
        update: { $set: mark, $setOnInsert: { createdAt: new Date() } },
        upsert: true,
      },
    }));

    const result = await marksCollection.bulkWrite(operations);

    let processedCount = 0;
    if (result) {
        processedCount = result.upsertedCount + result.modifiedCount;
    }
    
    // Consider revalidating paths if marks are displayed elsewhere, e.g., student profile or admin reports
    // revalidatePath('/dashboard/student/results'); // Example
    // revalidatePath('/dashboard/admin/reports');  // Example

    return {
      success: true,
      message: `Successfully saved marks for ${processedCount} students.`,
      count: processedCount,
    };

  } catch (error) {
    console.error('Submit marks server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during marks submission.', error: errorMessage };
  }
}

export async function getMarksForAssessment(
  schoolId: string,
  classId: string,
  subjectId: string,
  assessmentName: string,
  term: string,
  academicYear: string
): Promise<GetMarksResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.' };
    }
    // Add more ID validations as needed for classId, subjectId etc. if they are ObjectIds

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<MarkEntry>('marks');

    const marks = await marksCollection.find({
      schoolId: new ObjectId(schoolId),
      classId: classId, // Assuming classId is stored as string if it's a name, or ObjectId if it's an ID
      subjectId: subjectId,
      assessmentName: assessmentName,
      term: term,
      academicYear: academicYear,
    }).toArray();

    const marksWithStrId = marks.map(mark => ({
        ...mark,
        _id: mark._id.toString(),
        studentId: mark.studentId.toString(),
        markedByTeacherId: mark.markedByTeacherId.toString(),
        schoolId: mark.schoolId.toString(),
    }));

    return { success: true, marks: marksWithStrId };

  } catch (error) {
    console.error('Get marks server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch marks.' };
  }
}

// Placeholder for fetching subjects a teacher is assigned to or can enter marks for.
// This would likely involve looking up class assignments, then subjects for those classes.
export async function getSubjectsForTeacher(teacherId: string, schoolId: string): Promise<{ value: string, label: string, classId: string, className: string }[]> {
    // TODO: Implement actual logic based on how subjects are assigned to teachers or classes.
    // For now, this is a placeholder. It might look at SchoolClass documents where teacher is classTeacherId,
    // or a more complex mapping if teachers teach subjects across multiple classes.
    
    // Example: Fetch classes the teacher is a classTeacher of, then get subjects of those classes
    if (!ObjectId.isValid(teacherId) || !ObjectId.isValid(schoolId)) {
        return [];
    }
    try {
        const { db } = await connectToDatabase();
        const schoolClassesCollection = db.collection('school_classes');
        const teacherClasses = await schoolClassesCollection.find({
            schoolId: new ObjectId(schoolId),
            classTeacherId: new ObjectId(teacherId) // Find classes where this teacher is the classTeacher
        }).project({ _id: 1, name: 1, subjects: 1 }).toArray();

        const subjects: { value: string, label: string, classId: string, className: string }[] = [];
        teacherClasses.forEach(cls => {
            (cls.subjects as Array<{name: string}> || []).forEach(subj => {
                 // Ensure subject isn't already added from another class if teacher handles same subject in multiple primary classes
                if (!subjects.some(s => s.value === subj.name && s.classId === cls._id.toString())) {
                    subjects.push({
                        value: subj.name, // Using subject name as value for simplicity
                        label: `${subj.name} (Class: ${cls.name})`,
                        classId: cls._id.toString(),
                        className: cls.name
                    });
                }
            });
        });
        return subjects.sort((a,b) => a.label.localeCompare(b.label));

    } catch (error) {
        console.error("Error fetching subjects for teacher:", error);
        return [];
    }
}
