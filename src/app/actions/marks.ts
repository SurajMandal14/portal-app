
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { MarkEntry, MarksSubmissionPayload, SubmitMarksResult, GetMarksResult } from '@/types/marks';
import { marksSubmissionPayloadSchema } from '@/types/marks';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import type { SchoolClass, SchoolClassSubject } from '@/types/classes';

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

    // Validate ObjectIds
    if (!ObjectId.isValid(classId) || !ObjectId.isValid(schoolId) || !ObjectId.isValid(markedByTeacherId)) {
        return { success: false, message: 'Invalid ID format for class, school, or teacher.', error: 'Invalid ID format.' };
    }
    for (const sm of studentMarks) {
        if(!ObjectId.isValid(sm.studentId)) {
            return { success: false, message: `Invalid Student ID format: ${sm.studentId}`, error: 'Invalid Student ID.'}
        }
    }


    const marksToUpsert: Omit<MarkEntry, '_id'>[] = studentMarks.map(sm => ({
      studentId: new ObjectId(sm.studentId),
      studentName: sm.studentName,
      classId: classId, 
      className: className,
      subjectId: subjectId, // This is likely the subject name, used as an identifier
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
          classId: mark.classId, // Match based on the classId (actual ID)
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
  classId: string, // Expecting actual class _id string here
  subjectId: string, // Expecting subject name as ID here
  assessmentName: string,
  term: string,
  academicYear: string
): Promise<GetMarksResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<MarkEntry>('marks');

    const marks = await marksCollection.find({
      schoolId: new ObjectId(schoolId),
      classId: classId, 
      subjectId: subjectId, // Match subject by its name (or formal ID if that's what subjectId stores)
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
        // classId is already a string if fetched after conversion, or ensure it is.
        classId: mark.classId.toString(), 
    }));

    return { success: true, marks: marksWithStrId };

  } catch (error) {
    console.error('Get marks server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch marks.' };
  }
}


export interface SubjectForTeacher {
  value: string; // Composite key: e.g., classId + "_" + subjectName
  label: string; // e.g., "Mathematics (Grade 10A)"
  classId: string; // ObjectId of the class as string
  className: string;
  subjectName: string; // Original subject name
}

export async function getSubjectsForTeacher(teacherId: string, schoolId: string): Promise<SubjectForTeacher[]> {
    if (!ObjectId.isValid(teacherId) || !ObjectId.isValid(schoolId)) {
        console.warn("getSubjectsForTeacher: Invalid teacherId or schoolId format provided.");
        return [];
    }
    try {
        const { db } = await connectToDatabase();
        // Type assertion for documents from 'school_classes' collection
        const schoolClassesCollection = db.collection<Omit<SchoolClass, '_id' | 'schoolId'> & { _id: ObjectId; schoolId: ObjectId }>('school_classes'); 
        
        const teacherObjectId = new ObjectId(teacherId);
        const schoolObjectId = new ObjectId(schoolId);

        const classesInSchool = await schoolClassesCollection.find({ schoolId: schoolObjectId }).toArray();
        
        const taughtSubjects: SubjectForTeacher[] = [];

        classesInSchool.forEach(cls => {
            const classSubjects = (cls.subjects || []) as SchoolClassSubject[]; // Ensure cls.subjects is an array

            classSubjects.forEach(subject => {
                let isMatch = false;
                if (subject.teacherId) {
                    // Standardize comparison to string form of ObjectId
                    const subjectTeacherIdStr = subject.teacherId.toString();
                    isMatch = subjectTeacherIdStr === teacherId; // teacherId is already a string
                }

                if (isMatch) {
                    const uniqueValue = `${cls._id.toString()}_${subject.name}`;
                    if (!taughtSubjects.some(ts => ts.value === uniqueValue)) {
                        taughtSubjects.push({
                            value: uniqueValue,
                            label: `${subject.name} (${cls.name})`,
                            classId: cls._id.toString(),
                            className: cls.name,
                            subjectName: subject.name
                        });
                    }
                }
            });
        });
        
        return taughtSubjects.sort((a, b) => a.label.localeCompare(b.label));

    } catch (error) {
        console.error("Error fetching subjects for teacher:", error);
        return [];
    }
}
