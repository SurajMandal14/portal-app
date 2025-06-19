
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
    const validatedPayloadStructure = marksSubmissionPayloadSchema.safeParse(payload);
    if (!validatedPayloadStructure.success) {
      const errors = validatedPayloadStructure.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { success: false, message: 'Validation failed for payload structure.', error: errors };
    }

    const {
      classId, className, subjectId, subjectName,
      academicYear, markedByTeacherId, schoolId, studentMarks
    } = validatedPayloadStructure.data;

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<Omit<MarkEntry, '_id'>>('marks');

    if (!ObjectId.isValid(classId) || !ObjectId.isValid(schoolId) || !ObjectId.isValid(markedByTeacherId)) {
        return { success: false, message: 'Invalid ID format for class, school, or teacher.', error: 'Invalid ID format.' };
    }
    for (const sm of studentMarks) {
        if(!ObjectId.isValid(sm.studentId)) {
            return { success: false, message: `Invalid Student ID format: ${sm.studentId}`, error: 'Invalid Student ID.'}
        }
         if (!sm.assessmentName || sm.assessmentName.trim() === "") {
            return { success: false, message: `Assessment name missing for student ${sm.studentName}.`, error: 'Missing assessment name in student marks.'}
        }
    }

    const operations = studentMarks.map(sm => {
      const markFieldsToSet = {
        studentId: new ObjectId(sm.studentId),
        studentName: sm.studentName,
        classId: classId,
        className: className,
        subjectId: subjectId,
        subjectName: subjectName,
        assessmentName: sm.assessmentName, // Use specific assessment name from each mark entry
        // term: term, // Removed
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
            // term: markFieldsToSet.term, // Removed
            academicYear: markFieldsToSet.academicYear,
            schoolId: markFieldsToSet.schoolId,
          },
          update: {
            $set: {
              studentName: markFieldsToSet.studentName,
              className: markFieldsToSet.className,
              subjectName: markFieldsToSet.subjectName,
              marksObtained: markFieldsToSet.marksObtained,
              maxMarks: markFieldsToSet.maxMarks,
              markedByTeacherId: markFieldsToSet.markedByTeacherId,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              studentId: markFieldsToSet.studentId,
              classId: markFieldsToSet.classId,
              subjectId: markFieldsToSet.subjectId,
              assessmentName: markFieldsToSet.assessmentName,
              // term: markFieldsToSet.term, // Removed
              academicYear: markFieldsToSet.academicYear,
              schoolId: markFieldsToSet.schoolId,
              createdAt: new Date(),
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
    let processedCount = result.upsertedCount + result.modifiedCount;

    revalidatePath('/dashboard/teacher/marks');
    revalidatePath('/dashboard/admin/reports/generate-cbse-state');

    return {
      success: true,
      message: `Successfully saved marks for ${processedCount} assessment entries.`,
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
  subjectNameParam: string,
  assessmentNameBase: string, // e.g., "FA1", "SA1"
  // term: string, // Removed
  academicYear: string
): Promise<GetMarksResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<MarkEntry>('marks');

    let queryAssessmentFilter: { $regex: string } | { $in: string[] };

    if (["FA1", "FA2", "FA3", "FA4"].includes(assessmentNameBase)) {
      queryAssessmentFilter = { $regex: `^${assessmentNameBase}-Tool` };
    } else if (["SA1", "SA2"].includes(assessmentNameBase)) {
      queryAssessmentFilter = { $regex: `^${assessmentNameBase}-Paper` };
    } else {
      // For any other specific assessment names (though current UI won't use this path)
      queryAssessmentFilter = { $in: [assessmentNameBase] };
    }

    const marks = await marksCollection.find({
      schoolId: new ObjectId(schoolId),
      classId: classId,
      subjectId: subjectNameParam, // Querying by subjectName (which is stored in subjectId field in DB)
      assessmentName: queryAssessmentFilter,
      // term: term, // Removed
      academicYear: academicYear,
    }).toArray();

    const marksWithStrId = marks.map(mark => ({
        ...mark,
        _id: mark._id!.toString(),
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
                    const subjectTeacherIdStr = typeof subject.teacherId === 'string' ? subject.teacherId : subject.teacherId?.toString();
                    isMatch = subjectTeacherIdStr === teacherId;
                }

                if (isMatch) {
                    const uniqueValue = `${cls._id.toString()}_${subject.name}`;
                    if (!taughtSubjects.some(ts => ts.value === uniqueValue)) {
                        taughtSubjects.push({
                            value: uniqueValue,
                            label: `${subject.name} (${cls.name}${cls.section ? ` - ${cls.section}` : ''})`, // Include section in label
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

export async function getStudentMarksForReportCard(studentId: string, schoolId: string, academicYear: string, classId: string): Promise<GetMarksResult> {
  try {
    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid Student, School, or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<MarkEntry>('marks');

    const marks = await marksCollection.find({
      studentId: new ObjectId(studentId),
      schoolId: new ObjectId(schoolId),
      classId: classId,
      academicYear: academicYear,
    }).toArray();

    const marksWithStrId = marks.map(mark => ({
        ...mark,
        _id: mark._id!.toString(),
        studentId: mark.studentId.toString(),
        markedByTeacherId: mark.markedByTeacherId.toString(),
        schoolId: mark.schoolId.toString(),
        classId: mark.classId.toString(),
    }));

    return { success: true, marks: marksWithStrId };

  } catch (error) {
    console.error('Get student marks for report card error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch marks for report card.' };
  }
}
