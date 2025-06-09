
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { SchoolClass, CreateClassFormData, SchoolClassResult, SchoolClassesResult, SchoolClassSubject } from '@/types/classes';
import { createClassFormSchema, updateClassFormSchema } from '@/types/classes';
import type { User } from '@/types/user';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

// Helper function to update teacher's classId
async function updateTeacherClassAssignment(db: any, teacherId: string | ObjectId | null | undefined, newClassIdForTeacher: string | null, schoolId: string | ObjectId) {
  if (!teacherId) return; // No teacher to update

  const teacherObjectId = new ObjectId(teacherId);
  const usersCollection = db.collection<User>('users');

  // Find the teacher
  const teacher = await usersCollection.findOne({ _id: teacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' });
  if (!teacher) {
    console.warn(`updateTeacherClassAssignment: Teacher with ID ${teacherId} not found in school ${schoolId}.`);
    return;
  }

  // 1. Clear `classId` for any teacher who was previously assigned to the class `newClassIdForTeacher` (if `newClassIdForTeacher` is not null).
  // This is important if a class is getting a *new* class teacher. The *old* class teacher of that class needs their `classId` cleared.
  // This situation is handled when updating a class below.

  // 2. Update the specified teacher's `classId`
  await usersCollection.updateOne(
    { _id: teacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' },
    { $set: { classId: newClassIdForTeacher ? newClassIdForTeacher.toString() : undefined, updatedAt: new Date().toISOString() } }
  );
  console.log(`Teacher ${teacherId} classId updated to ${newClassIdForTeacher}`);
}


export async function createSchoolClass(schoolId: string, values: CreateClassFormData): Promise<SchoolClassResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid School ID format.' };
    }

    const validatedFields = createClassFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join('; ');
      return { success: false, message: 'Validation failed', error: errors };
    }

    const { name, classTeacherId, subjects } = validatedFields.data;

    const { db } = await connectToDatabase();
    const classesCollection = db.collection('school_classes'); // Use raw collection for insertion
    const usersCollection = db.collection<User>('users');

    // Check if class name already exists for this school
    const existingClass = await classesCollection.findOne({ name, schoolId: new ObjectId(schoolId) });
    if (existingClass) {
      return { success: false, message: `Class with name "${name}" already exists in this school.` };
    }

    // Validate classTeacherId if provided
    let validTeacherObjectId: ObjectId | undefined = undefined;
    if (classTeacherId && classTeacherId.trim() !== "" && classTeacherId !== "__NONE_TEACHER_OPTION__") {
      if (!ObjectId.isValid(classTeacherId)) {
        return { success: false, message: 'Invalid Class Teacher ID format.' };
      }
      validTeacherObjectId = new ObjectId(classTeacherId);
      const teacherExists = await usersCollection.findOne({ _id: validTeacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' });
      if (!teacherExists) {
        return { success: false, message: 'Selected class teacher not found or is not a teacher in this school.' };
      }
    }

    const newClassDataForDb = {
      schoolId: new ObjectId(schoolId),
      name,
      classTeacherId: validTeacherObjectId, // Store as ObjectId in DB
      subjects: subjects.map(s => ({ name: s.name.trim() })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await classesCollection.insertOne(newClassDataForDb);
    if (!result.insertedId) {
      return { success: false, message: 'Failed to create class.', error: 'Database insertion failed.' };
    }

    const createdClassId = result.insertedId;

    if (validTeacherObjectId) {
      await updateTeacherClassAssignment(db, validTeacherObjectId, createdClassId.toString(), schoolId);
    }
    
    revalidatePath('/dashboard/admin/classes');
    
    const clientCreatedClass: SchoolClass = {
        _id: createdClassId.toString(),
        name: newClassDataForDb.name,
        schoolId: newClassDataForDb.schoolId.toString(),
        subjects: newClassDataForDb.subjects,
        createdAt: newClassDataForDb.createdAt.toISOString(),
        updatedAt: newClassDataForDb.updatedAt.toISOString(),
        classTeacherId: newClassDataForDb.classTeacherId ? newClassDataForDb.classTeacherId.toString() : undefined,
    };

    return {
      success: true,
      message: `Class "${name}" created successfully!`,
      class: clientCreatedClass,
    };

  } catch (error) {
    console.error('Create school class server action error:', error);
    return { success: false, message: 'An unexpected error occurred during class creation.' };
  }
}

export async function getSchoolClasses(schoolId: string): Promise<SchoolClassesResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid School ID format.' };
    }
    const { db } = await connectToDatabase();
    
    const classesWithTeacherDetails = await db.collection('school_classes').aggregate([ // Use raw collection
      { $match: { schoolId: new ObjectId(schoolId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'classTeacherId', // This is ObjectId in DB
          foreignField: '_id',
          as: 'classTeacherInfo'
        }
      },
      {
        $unwind: {
          path: '$classTeacherInfo',
          preserveNullAndEmptyArrays: true 
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          schoolId: 1,
          subjects: 1,
          createdAt: 1,
          updatedAt: 1,
          classTeacherId: 1, // This is ObjectId
          classTeacherName: '$classTeacherInfo.name'
        }
      },
      { $sort: { name: 1 } } 
    ]).toArray();

    const classes: SchoolClass[] = classesWithTeacherDetails.map(cls => ({
      _id: (cls._id as ObjectId).toString(),
      name: cls.name || '',
      schoolId: (cls.schoolId as ObjectId).toString(),
      subjects: cls.subjects || [],
      createdAt: cls.createdAt ? new Date(cls.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: cls.updatedAt ? new Date(cls.updatedAt).toISOString() : new Date().toISOString(),
      classTeacherId: cls.classTeacherId ? (cls.classTeacherId as ObjectId).toString() : undefined,
      classTeacherName: (cls as any).classTeacherName || undefined,
    }));

    return { success: true, classes };
  } catch (error) {
    console.error('Get school classes server action error:', error);
    return { success: false, error: 'Failed to fetch classes.', message: 'An unexpected error occurred.' };
  }
}

export async function updateSchoolClass(classId: string, schoolId: string, values: CreateClassFormData): Promise<SchoolClassResult> {
  try {
    if (!ObjectId.isValid(classId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid Class or School ID format.' };
    }

    const validatedFields = updateClassFormSchema.safeParse(values); 
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join('; ');
      return { success: false, message: 'Validation failed', error: errors };
    }

    const { name, classTeacherId, subjects } = validatedFields.data;

    const { db } = await connectToDatabase();
    const classesCollection = db.collection('school_classes'); // Use raw collection
    const usersCollection = db.collection<User>('users');

    const existingClassDoc = await classesCollection.findOne({ _id: new ObjectId(classId), schoolId: new ObjectId(schoolId) });
    if (!existingClassDoc) {
      return { success: false, message: 'Class not found or does not belong to this school.' };
    }

    if (name !== existingClassDoc.name) {
      const conflictingClass = await classesCollection.findOne({ name, schoolId: new ObjectId(schoolId), _id: { $ne: new ObjectId(classId) } });
      if (conflictingClass) {
        return { success: false, message: `Another class with name "${name}" already exists in this school.` };
      }
    }

    let newTeacherObjectId: ObjectId | null | undefined = undefined; 
    if (classTeacherId === null || classTeacherId === '' || classTeacherId === "__NONE_TEACHER_OPTION__") {
        newTeacherObjectId = null;
    } else if (classTeacherId && ObjectId.isValid(classTeacherId)) {
        newTeacherObjectId = new ObjectId(classTeacherId);
        const teacherExists = await usersCollection.findOne({ _id: newTeacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' });
        if (!teacherExists) {
            return { success: false, message: 'Selected new class teacher not found or is not a teacher in this school.' };
        }
    } else if (classTeacherId) { 
        return { success: false, message: 'Invalid New Class Teacher ID format.'};
    }

    const updateDataForDb: Partial<any> = { // Use any for DB update flexibility
      name,
      subjects: subjects.map(s => ({ name: s.name.trim() })),
      updatedAt: new Date(),
    };

    if (newTeacherObjectId !== undefined) { 
        updateDataForDb.classTeacherId = newTeacherObjectId; // Store as ObjectId or null
    }

    const result = await classesCollection.updateOne(
      { _id: new ObjectId(classId) },
      { $set: updateDataForDb }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'Class not found for update.' };
    }

    const oldTeacherIdFromDb = existingClassDoc.classTeacherId; // This is an ObjectId from DB
    const newAssignedTeacherIdFromInput = updateDataForDb.classTeacherId; // This is ObjectId or null

    if (oldTeacherIdFromDb?.toString() !== newAssignedTeacherIdFromInput?.toString()) {
        if (oldTeacherIdFromDb) {
            const oldTeacherDoc = await usersCollection.findOne({ _id: oldTeacherIdFromDb });
            if (oldTeacherDoc && oldTeacherDoc.classId === classId) { 
                 await updateTeacherClassAssignment(db, oldTeacherIdFromDb, null, schoolId);
            }
        }
        if (newAssignedTeacherIdFromInput) { // if not null
             await updateTeacherClassAssignment(db, newAssignedTeacherIdFromInput, classId, schoolId);
        }
    }
    
    revalidatePath('/dashboard/admin/classes');
    
    const updatedClassDocAfterDb = await classesCollection.findOne({ _id: new ObjectId(classId) });
     if (!updatedClassDocAfterDb) {
        return { success: false, message: "Failed to retrieve class after update." };
    }

    const clientUpdatedClass: SchoolClass = {
        _id: updatedClassDocAfterDb._id.toString(),
        name: updatedClassDocAfterDb.name,
        schoolId: (updatedClassDocAfterDb.schoolId as ObjectId).toString(),
        subjects: updatedClassDocAfterDb.subjects,
        createdAt: new Date(updatedClassDocAfterDb.createdAt).toISOString(),
        updatedAt: new Date(updatedClassDocAfterDb.updatedAt).toISOString(),
        classTeacherId: updatedClassDocAfterDb.classTeacherId ? (updatedClassDocAfterDb.classTeacherId as ObjectId).toString() : undefined,
        classTeacherName: undefined, // Not easily available without another lookup; list view will have it.
    };
    return { success: true, message: 'Class updated successfully!', class: clientUpdatedClass };

  } catch (error) {
    console.error('Update school class server action error:', error);
    return { success: false, message: 'An unexpected error occurred during class update.' };
  }
}

export async function deleteSchoolClass(classId: string, schoolId: string): Promise<SchoolClassResult> {
  try {
    if (!ObjectId.isValid(classId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid Class or School ID format.' };
    }

    const { db } = await connectToDatabase();
    const classesCollection = db.collection('school_classes'); // Raw collection
    const usersCollection = db.collection<User>('users');

    const classToDelete = await classesCollection.findOne({ _id: new ObjectId(classId), schoolId: new ObjectId(schoolId) });
    if (!classToDelete) {
      return { success: false, message: 'Class not found or does not belong to this school.' };
    }

    await usersCollection.updateMany(
      { schoolId: new ObjectId(schoolId), role: 'student', classId: classToDelete.name },
      { $set: { classId: undefined, updatedAt: new Date().toISOString() } }
    );
    
    if (classToDelete.classTeacherId) {
        const teacher = await usersCollection.findOne({_id: classToDelete.classTeacherId as ObjectId, role: 'teacher'});
        if(teacher && teacher.classId === classToDelete._id.toString()){
            await usersCollection.updateOne(
                { _id: classToDelete.classTeacherId as ObjectId },
                { $set: { classId: undefined, updatedAt: new Date().toISOString() } }
            );
        }
    }

    const result = await classesCollection.deleteOne({ _id: new ObjectId(classId) });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Failed to delete class or class not found.' };
    }
    
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/admin/users'); 
    revalidatePath('/dashboard/teacher/attendance'); 

    return { success: true, message: `Class "${classToDelete.name}" deleted successfully.` };

  } catch (error) {
    console.error('Delete school class server action error:', error);
    return { success: false, message: 'An unexpected error occurred during class deletion.' };
  }
}

export async function getClassesForSchoolAsOptions(schoolId: string): Promise<{ value: string; label: string }[]> {
  if (!ObjectId.isValid(schoolId)) {
    return [];
  }
  try {
    const { db } = await connectToDatabase();
    const classes = await db.collection('school_classes') // Raw collection
      .find({ schoolId: new ObjectId(schoolId) })
      .project({ _id: 1, name: 1 })
      .sort({ name: 1 })
      .toArray();
    
    return classes.map(cls => ({ value: (cls._id as ObjectId).toString(), label: cls.name as string }));
  } catch (error) {
    console.error("Error fetching classes for options:", error);
    return [];
  }
}
