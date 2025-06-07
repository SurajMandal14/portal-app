
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, UserRole } from '@/types/user';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

export const createSchoolUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['teacher', 'student'], { required_error: "Role is required." }),
  classId: z.string().optional(), // Optional, can be class name or ID
});

export type CreateSchoolUserFormData = z.infer<typeof createSchoolUserFormSchema>;

export interface CreateSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
  user?: Partial<User>;
}

export async function createSchoolUser(values: CreateSchoolUserFormData, schoolId: string): Promise<CreateSchoolUserResult> {
  try {
    const validatedFields = createSchoolUserFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID provided for user creation.', error: 'Invalid School ID.'};
    }

    const { name, email, password, role, classId } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<Omit<User, '_id'>>('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return { success: false, message: 'User with this email already exists.', error: 'Email already in use.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userSchoolId = new ObjectId(schoolId);

    const newUser: Omit<User, '_id'> = {
      name,
      email,
      password: hashedPassword,
      role: role as UserRole,
      schoolId: userSchoolId,
      classId: classId ? new ObjectId(classId) : undefined, // Assuming classId from form is an ObjectId string for now
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create user.', error: 'Database insertion failed.' };
    }

    revalidatePath('/dashboard/admin/users');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = newUser;
    return {
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`,
      user: { 
        ...userWithoutPassword, 
        _id: result.insertedId.toString(),
        schoolId: userSchoolId.toString(),
        classId: classId ? new ObjectId(classId).toString() : undefined,
      },
    };

  } catch (error) {
    console.error('Create school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user creation.', error: errorMessage };
  }
}

export interface GetSchoolUsersResult {
  success: boolean;
  users?: Partial<User>[]; // Users with potentially populated class names
  error?: string;
  message?: string;
}

export async function getSchoolUsers(schoolId: string): Promise<GetSchoolUsersResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID format for fetching users.', error: 'Invalid School ID.'};
    }
    const { db } = await connectToDatabase();
    
    // Fetch users and attempt to join with classes if classId is present
    // For simplicity, this example fetches users and then you might map class names on the client
    // or do a more complex aggregation if class details are stored in a separate collection.
    // Assuming `classId` on user refers to an _id in a 'classes' collection, or is a direct name for now.
    // For now, we'll return users and classId as is. Client can map className if needed from school details.
    const usersFromDb = await db.collection<User>('users').find({ 
      schoolId: new ObjectId(schoolId) as any,
      role: { $in: ['teacher', 'student'] } 
    }).sort({ createdAt: -1 }).toArray();
    
    const users = usersFromDb.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        _id: user._id.toString(),
        schoolId: user.schoolId?.toString(),
        classId: user.classId?.toString(), // Convert classId to string if it exists
      };
    });

    return { success: true, users };
  } catch (error) {
    console.error('Get school users server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch school users.' };
  }
}
