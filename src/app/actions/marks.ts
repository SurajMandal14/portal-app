
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

    // Prepare for bulk operations
    const operations = studentMarks.map(sm => {
      // Create the base mark object structure without _id, createdAt, updatedAt
      const markFieldsToSet = {
        studentId: new ObjectId(sm.studentId),
        studentName: sm.studentName,
        classId: classId, 
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
      };

      return {
        updateOne: {
          filter: {
            studentId: markFieldsToSet.studentId,
            classId: markFieldsToSet.classId,
            subjectId: markFieldsToSet.subjectId,
            assessmentName: markFieldsToSet.assessmentName,
            term: markFieldsToSet.term,
            academicYear: markFieldsToSet.academicYear,
            schoolId: markFieldsToSet.schoolId,
          },
          update: {
            $set: {
              ...markFieldsToSet, // Set all mutable fields
              updatedAt: new Date(), // Always update this
            },
            $setOnInsert: {
              createdAt: new Date(), // Set createdAt only when a new document is inserted
            },
          },
          upsert: true,
        },
      };
    });
    
    if (operations.length === 0) {
        return { success: true, message: "No marks data provided to submit.", count: 0};
    }

    const result = await marksCollection.bulkWrite(operations);

    let processedCount = 0;
    if (result) {
        processedCount = result.upsertedCount + result.modifiedCount;
    }
    
    // Consider revalidating paths if marks are displayed elsewhere, e.g., student profile or admin reports
    // revalidatePath('/dashboard/student/results'); 
    // revalidatePath('/dashboard/admin/reports');  

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
  value: string; 
  label: string; 
  classId: string; 
  className: string;
  subjectName: string; 
}

export async function getSubjectsForTeacher(teacherId: string, schoolId: string): Promise<SubjectForTeacher[]> {
    if (!ObjectId.isValid(teacherId) || !ObjectId.isValid(schoolId)) {
        console.warn("getSubjectsForTeacher: Invalid teacherId or schoolId format provided.");
        return [];
    }
    try {
        const { db } = await connectToDatabase();
        const schoolClassesCollection = db.collection<Omit<SchoolClass, '_id' | 'schoolId'> & { _id: ObjectId; schoolId: ObjectId }>('school_classes'); 
        
        const teacherObjectId = new ObjectId(teacherId);
        const schoolObjectId = new ObjectId(schoolId);

        const classesInSchool = await schoolClassesCollection.find({ schoolId: schoolObjectId }).toArray();
        
        const taughtSubjects: SubjectForTeacher[] = [];

        classesInSchool.forEach(cls => {
            const classSubjects = (cls.subjects || []) as SchoolClassSubject[]; 

            classSubjects.forEach(subject => {
                let isMatch = false;
                if (subject.teacherId) {
                    const subjectTeacherIdStr = subject.teacherId.toString();
                    isMatch = subjectTeacherIdStr === teacherId; 
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

