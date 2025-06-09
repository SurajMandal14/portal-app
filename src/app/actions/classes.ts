
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { SchoolClass, CreateClassFormData, SchoolClassResult, SchoolClassesResult, SchoolClassSubject } from '@/types/classes';
import { createClassFormSchema, updateClassFormSchema } from '@/types/classes';
import type { User } from '@/types/user';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

// Helper function to update teacher's User.classId field.
// This field indicates the class for which the teacher is the primary attendance marker.
async function updateTeacherPrimaryClassAssignment(db: any, teacherId: string | ObjectId | null | undefined, newPrimaryClassIdForTeacher: string | null, schoolId: string | ObjectId) {
  if (!teacherId) return; 

  const teacherObjectId = new ObjectId(teacherId);
  const usersCollection = db.collection<User>('users');

  const teacher = await usersCollection.findOne({ _id: teacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' });
  if (!teacher) {
    console.warn(`updateTeacherPrimaryClassAssignment: Teacher with ID ${teacherId} not found in school ${schoolId}.`);
    return;
  }
  
  // Update the specified teacher's `User.classId` to point to the new class ID (or clear it if newPrimaryClassIdForTeacher is null)
  // The User.classId should store the *string representation* of the Class's _id.
  await usersCollection.updateOne(
    { _id: teacherObjectId, schoolId: new ObjectId(schoolId), role: 'teacher' },
    { $set: { classId: newPrimaryClassIdForTeacher ? newPrimaryClassIdForTeacher.toString() : undefined, updatedAt: new Date() } } 
  );
  console.log(`Teacher ${teacherId} User.classId updated to ${newPrimaryClassIdForTeacher}`);
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
    const classesCollection = db.collection('school_classes'); 
    const usersCollection = db.collection<User>('users');

    const existingClass = await classesCollection.findOne({ name, schoolId: new ObjectId(schoolId) });
    if (existingClass) {
      return { success: false, message: `Class with name "${name}" already exists in this school.` };
    }

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

      // Check if this teacher is already a class teacher for any other class in this school
      const otherClassWithThisTeacher = await classesCollection.findOne({
        schoolId: new ObjectId(schoolId),
        classTeacherId: validTeacherObjectId,
      });
      if (otherClassWithThisTeacher) {
        const teacherDoc = await usersCollection.findOne({ _id: validTeacherObjectId });
        return { 
          success: false, 
          message: `Teacher "${teacherDoc?.name || 'Selected Teacher'}" is already assigned as class teacher to class "${otherClassWithThisTeacher.name}". A teacher can only be a class teacher for one class.` 
        };
      }
    }

    const newClassDataForDb = {
      schoolId: new ObjectId(schoolId),
      name,
      classTeacherId: validTeacherObjectId, 
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
      await updateTeacherPrimaryClassAssignment(db, validTeacherObjectId, createdClassId.toString(), schoolId);
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
    
    const classesWithTeacherDetails = await db.collection('school_classes').aggregate([ 
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
          classTeacherId: 1, 
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
    const classesCollection = db.collection('school_classes'); 
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

    let newTeacherObjectIdForClass: ObjectId | null = null; 
    if (classTeacherId && classTeacherId.trim() !== "" && classTeacherId !== "__NONE_TEACHER_OPTION__") {
        if (!ObjectId.isValid(classTeacherId)) {
             return { success: false, message: 'Invalid New Class Teacher ID format.'};
        }
        newTeacherObjectIdForClass = new ObjectId(classTeacherId);
        const teacherExists = await usersCollection.findOne({ _id: newTeacherObjectIdForClass, schoolId: new ObjectId(schoolId), role: 'teacher' });
        if (!teacherExists) {
            return { success: false, message: 'Selected new class teacher not found or is not a teacher in this school.' };
        }
        // Check if this teacher is already a class teacher for *another* class in this school
        const otherClassWithThisTeacher = await classesCollection.findOne({
            schoolId: new ObjectId(schoolId),
            classTeacherId: newTeacherObjectIdForClass,
            _id: { $ne: new ObjectId(classId) } // Exclude the current class itself
        });
        if (otherClassWithThisTeacher) {
            const teacherDoc = await usersCollection.findOne({ _id: newTeacherObjectIdForClass });
            return { 
                success: false, 
                message: `Teacher "${teacherDoc?.name || 'Selected Teacher'}" is already assigned as class teacher to class "${otherClassWithThisTeacher.name}". A teacher can only be a class teacher for one class.` 
            };
        }
    } // If classTeacherId is "" or "__NONE_TEACHER_OPTION__", newTeacherObjectIdForClass remains null (unassigning)

    
    const oldTeacherObjectIdFromDb = existingClassDoc.classTeacherId as ObjectId | null;

    const updateDataForDb: Partial<any> = {
      name,
      subjects: subjects.map(s => ({ name: s.name.trim() })),
      classTeacherId: newTeacherObjectIdForClass, // This will be null if unassigning
      updatedAt: new Date(),
    };

    const result = await classesCollection.updateOne(
      { _id: new ObjectId(classId) },
      { $set: updateDataForDb }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'Class not found for update.' };
    }

    // Handle User.classId updates for the teachers involved
    if (oldTeacherObjectIdFromDb?.toString() !== newTeacherObjectIdForClass?.toString()) {
        // If there was an old teacher for *this* class, clear their User.classId if it pointed to this class
        if (oldTeacherObjectIdFromDb) {
            const oldTeacherUserDoc = await usersCollection.findOne({_id: oldTeacherObjectIdFromDb, role: 'teacher'});
            if (oldTeacherUserDoc && oldTeacherUserDoc.classId === classId.toString()) { // Check if they were primary for THIS class
                await updateTeacherPrimaryClassAssignment(db, oldTeacherObjectIdFromDb, null, schoolId); // Clears User.classId
            }
        }
        // If a new teacher is being assigned to *this* class (and it's not null)
        if (newTeacherObjectIdForClass) { 
            await updateTeacherPrimaryClassAssignment(db, newTeacherObjectIdForClass, classId.toString(), schoolId); // Sets User.classId to this class's ID string
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
        classTeacherName: undefined, 
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
    const classesCollection = db.collection('school_classes'); 
    const usersCollection = db.collection<User>('users');

    const classToDelete = await classesCollection.findOne({ _id: new ObjectId(classId), schoolId: new ObjectId(schoolId) });
    if (!classToDelete) {
      return { success: false, message: 'Class not found or does not belong to this school.' };
    }

    // Unassign students from this class by clearing their classId (if it stores class NAME)
    // This needs alignment: if User.classId stores class ID, this needs to change.
    // Assuming User.classId for students stores class NAME for now as per previous User Management setup.
    await usersCollection.updateMany(
      { schoolId: new ObjectId(schoolId), role: 'student', classId: classToDelete.name },
      { $set: { classId: undefined, updatedAt: new Date() } }
    );
    
    // If a teacher was assigned as class teacher to this class, clear their User.classId
    if (classToDelete.classTeacherId) {
        const teacher = await usersCollection.findOne({_id: classToDelete.classTeacherId as ObjectId, role: 'teacher'});
        if(teacher && teacher.classId === classToDelete._id.toString()){ // Check if their User.classId was this class's ID
            await updateTeacherPrimaryClassAssignment(db, classToDelete.classTeacherId as ObjectId, null, schoolId); // Clears User.classId
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
    const classes = await db.collection('school_classes') 
      .find({ schoolId: new ObjectId(schoolId) })
      .project({ _id: 1, name: 1 })
      .sort({ name: 1 })
      .toArray();
    
    // Returns options where value is class ID (string) and label is class name
    return classes.map(cls => ({ value: (cls._id as ObjectId).toString(), label: cls.name as string }));
  } catch (error) {
    console.error("Error fetching classes for options:", error);
    return [];
  }
}

