
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

  // If this teacher was previously class teacher of another class (and that class still points to them), clear that old class's teacherId
  // For simplicity, we'll assume a teacher can only be a class teacher of ONE class for attendance.
  // This logic can be complex if a teacher can be primary for multiple. Current model is one primary class for attendance.
  
  // Clear classId for any other class that might currently list this teacher.
  // This step ensures a teacher isn't assigned as primary for multiple classes if the UI/flow doesn't prevent it.
  // However, the main update is to set the newClassIdForTeacher on the current teacher.
  // This might also need to clear classId from teachers previously assigned to *this* newClassIdForTeacher if it's being reassigned.

  // 1. Clear `classId` for any teacher who was previously assigned to the class `newClassIdForTeacher` (if `newClassIdForTeacher` is not null).
  // This is important if a class is getting a *new* class teacher. The *old* class teacher of that class needs their `classId` cleared.
  // This situation is handled when updating a class below.

  // 2. Update the specified teacher's `classId`
  await usersCollection.updateOne(
    { _id: teacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' },
    { $set: { classId: newClassIdForTeacher ? newClassIdForTeacher.toString() : undefined, updatedAt: new Date() } }
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
    const classesCollection = db.collection<Omit<SchoolClass, '_id'>>('school_classes');
    const usersCollection = db.collection<User>('users');

    // Check if class name already exists for this school
    const existingClass = await classesCollection.findOne({ name, schoolId: new ObjectId(schoolId) });
    if (existingClass) {
      return { success: false, message: `Class with name "${name}" already exists in this school.` };
    }

    // Validate classTeacherId if provided
    let validTeacherId: ObjectId | undefined = undefined;
    if (classTeacherId && classTeacherId.trim() !== "") {
      if (!ObjectId.isValid(classTeacherId)) {
        return { success: false, message: 'Invalid Class Teacher ID format.' };
      }
      validTeacherId = new ObjectId(classTeacherId);
      const teacherExists = await usersCollection.findOne({ _id: validTeacherId, schoolId: new ObjectId(schoolId), role: 'teacher' });
      if (!teacherExists) {
        return { success: false, message: 'Selected class teacher not found or is not a teacher in this school.' };
      }
    }

    const newClassData: Omit<SchoolClass, '_id'> = {
      schoolId: new ObjectId(schoolId),
      name,
      classTeacherId: validTeacherId,
      subjects: subjects.map(s => ({ name: s.name.trim() })), // Trim subject names
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await classesCollection.insertOne(newClassData);
    if (!result.insertedId) {
      return { success: false, message: 'Failed to create class.', error: 'Database insertion failed.' };
    }

    const createdClassId = result.insertedId;

    // If a class teacher was assigned, update that teacher's User.classId field
    if (validTeacherId) {
      await updateTeacherClassAssignment(db, validTeacherId, createdClassId.toString(), schoolId);
    }
    
    revalidatePath('/dashboard/admin/classes');
    return {
      success: true,
      message: `Class "${name}" created successfully!`,
      class: { ...newClassData, _id: createdClassId.toString() } as SchoolClass,
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
    
    const classesWithTeacherDetails = await db.collection<SchoolClass>('school_classes').aggregate([
      { $match: { schoolId: new ObjectId(schoolId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'classTeacherId',
          foreignField: '_id',
          as: 'classTeacherInfo'
        }
      },
      {
        $unwind: {
          path: '$classTeacherInfo',
          preserveNullAndEmptyArrays: true // Keep classes even if no teacher is assigned
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
          classTeacherId: 1,
          classTeacherName: '$classTeacherInfo.name' // Get teacher's name
        }
      },
      { $sort: { name: 1 } } // Sort by class name
    ]).toArray();

    const classes = classesWithTeacherDetails.map(cls => ({
      ...cls,
      _id: cls._id.toString(),
      schoolId: cls.schoolId.toString(),
      classTeacherId: cls.classTeacherId?.toString(),
    })) as SchoolClass[]; // Casting because aggregation might change type slightly

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

    const validatedFields = updateClassFormSchema.safeParse(values); // Using the same schema for update
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join('; ');
      return { success: false, message: 'Validation failed', error: errors };
    }

    const { name, classTeacherId, subjects } = validatedFields.data;

    const { db } = await connectToDatabase();
    const classesCollection = db.collection<SchoolClass>('school_classes');
    const usersCollection = db.collection<User>('users');

    // Find the existing class
    const existingClass = await classesCollection.findOne({ _id: new ObjectId(classId), schoolId: new ObjectId(schoolId) });
    if (!existingClass) {
      return { success: false, message: 'Class not found or does not belong to this school.' };
    }

    // Check if new class name conflicts with another class in the same school
    if (name !== existingClass.name) {
      const conflictingClass = await classesCollection.findOne({ name, schoolId: new ObjectId(schoolId), _id: { $ne: new ObjectId(classId) } });
      if (conflictingClass) {
        return { success: false, message: `Another class with name "${name}" already exists in this school.` };
      }
    }

    // Validate new classTeacherId if provided
    let newTeacherObjectId: ObjectId | null | undefined = undefined; // undefined means no change, null means unassign
    if (classTeacherId === null || classTeacherId === '') { // Explicitly unassigning
        newTeacherObjectId = null;
    } else if (classTeacherId && ObjectId.isValid(classTeacherId)) {
        newTeacherObjectId = new ObjectId(classTeacherId);
        const teacherExists = await usersCollection.findOne({ _id: newTeacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' });
        if (!teacherExists) {
            return { success: false, message: 'Selected new class teacher not found or is not a teacher in this school.' };
        }
    } else if (classTeacherId) { // Invalid ID format
        return { success: false, message: 'Invalid New Class Teacher ID format.'};
    }


    const updateData: Partial<Omit<SchoolClass, '_id' | 'schoolId' | 'createdAt'>> = {
      name,
      subjects: subjects.map(s => ({ name: s.name.trim() })),
      updatedAt: new Date(),
    };

    if (newTeacherObjectId !== undefined) { // Only update if a new value (ObjectId or null) is determined
        updateData.classTeacherId = newTeacherObjectId;
    }


    const result = await classesCollection.updateOne(
      { _id: new ObjectId(classId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'Class not found for update.' };
    }

    // Handle teacher re-assignment logic
    const oldTeacherId = existingClass.classTeacherId;
    const newAssignedTeacherId = updateData.classTeacherId; // This will be ObjectId or null

    if (oldTeacherId?.toString() !== newAssignedTeacherId?.toString()) {
        // If old teacher exists and is different from new, clear their classId for this class
        if (oldTeacherId) {
            const oldTeacherDoc = await usersCollection.findOne({ _id: new ObjectId(oldTeacherId) });
            // Clear old teacher's classId only if they were assigned to THIS class
            if (oldTeacherDoc && oldTeacherDoc.classId === classId) { 
                 await updateTeacherClassAssignment(db, oldTeacherId, null, schoolId);
            }
        }
        // If a new teacher is assigned (not null), update their classId
        if (newAssignedTeacherId) {
             await updateTeacherClassAssignment(db, newAssignedTeacherId, classId, schoolId);
        }
    }
    
    revalidatePath('/dashboard/admin/classes');
    const updatedClass = await classesCollection.findOne({ _id: new ObjectId(classId) });
    return { success: true, message: 'Class updated successfully!', class: updatedClass as SchoolClass };

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
    const classesCollection = db.collection<SchoolClass>('school_classes');
    const usersCollection = db.collection<User>('users');

    const classToDelete = await classesCollection.findOne({ _id: new ObjectId(classId), schoolId: new ObjectId(schoolId) });
    if (!classToDelete) {
      return { success: false, message: 'Class not found or does not belong to this school.' };
    }

    // Clear classId for students in this class
    await usersCollection.updateMany(
      { schoolId: new ObjectId(schoolId), role: 'student', classId: classToDelete.name }, // Assuming student.classId stores class NAME
      { $set: { classId: undefined, updatedAt: new Date() } }
    );
    // Clear classId for the class teacher of this class
    if (classToDelete.classTeacherId) {
        const teacher = await usersCollection.findOne({_id: new ObjectId(classToDelete.classTeacherId), role: 'teacher'});
        // Only clear classId if teacher was specifically assigned to this class via their User.classId
        // User.classId should store the class ID not name for teachers if it's their primary attendance class
        if(teacher && teacher.classId === classToDelete._id.toString()){
            await usersCollection.updateOne(
                { _id: new ObjectId(classToDelete.classTeacherId) },
                { $set: { classId: undefined, updatedAt: new Date() } }
            );
        }
    }


    const result = await classesCollection.deleteOne({ _id: new ObjectId(classId) });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Failed to delete class or class not found.' };
    }
    
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/admin/users'); // Student class assignments might change
    revalidatePath('/dashboard/teacher/attendance'); // Teacher class assignments might change

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
    const classes = await db.collection<SchoolClass>('school_classes')
      .find({ schoolId: new ObjectId(schoolId) })
      .project({ _id: 1, name: 1 })
      .sort({ name: 1 })
      .toArray();
    
    return classes.map(cls => ({ value: cls._id.toString(), label: cls.name }));
  } catch (error) {
    console.error("Error fetching classes for options:", error);
    return [];
  }
}
