
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, SchoolAdminFormData } from '@/types/user';
import type { School } from '@/types/school';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

const schoolAdminFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  schoolId: z.string().min(1, { message: "School selection is required." }),
});

export interface CreateSchoolAdminResult {
  success: boolean;
  message: string;
  error?: string;
  user?: Partial<User>;
}

export async function createSchoolAdmin(values: SchoolAdminFormData): Promise<CreateSchoolAdminResult> {
  try {
    const validatedFields = schoolAdminFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { name, email, password, schoolId } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<Omit<User, '_id'>>('users');
    const schoolsCollection = db.collection<School>('schools');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return { success: false, message: 'User with this email already exists.', error: 'Email already in use.' };
    }

    // Check if school exists
    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.'};
    }
    const school = await schoolsCollection.findOne({ _id: new ObjectId(schoolId) as any });
    if (!school) {
      return { success: false, message: 'Selected school not found.', error: 'School not found.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: Omit<User, '_id'> = {
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      schoolId: new ObjectId(schoolId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create school admin.', error: 'Database insertion failed.' };
    }

    revalidatePath('/dashboard/super-admin/users');

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return {
      success: true,
      message: 'School Admin created successfully!',
      user: { ...userWithoutPassword, _id: result.insertedId.toString() },
    };

  } catch (error) {
    console.error('Create school admin server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during admin creation.', error: errorMessage };
  }
}

export interface GetSchoolAdminsResult {
  success: boolean;
  admins?: (Partial<User> & { schoolName?: string })[]; // Admins with school name
  error?: string;
  message?: string;
}

export async function getSchoolAdmins(): Promise<GetSchoolAdminsResult> {
  try {
    const { db } = await connectToDatabase();
    // Using an aggregation pipeline to join users with schools
    const adminsWithSchool = await db.collection<User>('users').aggregate([
      {
        $match: { role: 'admin' } // Filter for admin users
      },
      {
        $lookup: {
          from: 'schools', // The collection to join with
          let: { schoolIdObj: { $toObjectId: '$schoolId' } }, // Convert schoolId string to ObjectId if necessary
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$schoolIdObj'] } } },
            { $project: { schoolName: 1 } } // Only get the schoolName
          ],
          as: 'schoolInfo' // The array field to add the joined documents to
        }
      },
      {
        $unwind: { // Deconstructs the schoolInfo array
          path: '$schoolInfo',
          preserveNullAndEmptyArrays: true // Keep admins even if their school is not found (shouldn't happen with good data)
        }
      },
      {
        $project: { // Select and shape the output fields
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          schoolId: 1,
          schoolName: '$schoolInfo.schoolName', // Get the schoolName from the joined schoolInfo
          createdAt: 1,
          updatedAt: 1,
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();
    
    const admins = adminsWithSchool.map(admin => ({
      ...admin,
      _id: admin._id.toString(),
      schoolId: admin.schoolId?.toString(),
    }));

    return { success: true, admins: admins as (Partial<User> & { schoolName?: string })[] };
  } catch (error) {
    console.error('Get school admins server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch school admins.' };
  }
}
