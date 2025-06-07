
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { School, ClassFeeConfig, SchoolFormData } from '@/types/school'; // Import SchoolFormData
import { schoolFormSchema } from '@/types/school'; // Import schoolFormSchema
import { revalidatePath } from 'next/cache';

// classFeeSchema and schoolFormSchema are now imported from '@/types/school'
// export type SchoolFormData = z.infer<typeof schoolFormSchema>; // This is now imported

export interface CreateSchoolResult {
  success: boolean;
  message: string;
  error?: string;
  school?: School;
}

export async function createSchool(values: SchoolFormData): Promise<CreateSchoolResult> {
  try {
    const validatedFields = schoolFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { schoolName, classFees, schoolLogo } = validatedFields.data;

    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<Omit<School, '_id'>>('schools');

    const newSchoolData: Omit<School, '_id'> = {
      schoolName,
      classFees: classFees.map(cf => ({
        className: cf.className,
        tuitionFee: cf.tuitionFee,
        busFee: cf.busFee || 0,
        canteenFee: cf.canteenFee || 0,
      })),
      // For now, schoolLogoUrl will be undefined. File upload to be handled later.
      // If schoolLogo was a string (URL), you could assign it here.
      schoolLogoUrl: typeof schoolLogo === 'string' ? schoolLogo : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await schoolsCollection.insertOne(newSchoolData);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create school profile.', error: 'Database insertion failed.' };
    }
    
    revalidatePath('/dashboard/super-admin/schools'); // Revalidate the page to show the new school

    return {
      success: true,
      message: 'School profile created successfully!',
      school: { ...newSchoolData, _id: result.insertedId.toString() } as School,
    };

  } catch (error) {
    console.error('Create school server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during school creation.', error: errorMessage };
  }
}


export interface GetSchoolsResult {
  success: boolean;
  schools?: School[];
  error?: string;
  message?: string;
}

export async function getSchools(): Promise<GetSchoolsResult> {
  try {
    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<School>('schools');
    
    const schools = await schoolsCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    // Convert ObjectId to string for _id field
    const schoolsWithStrId = schools.map(school => ({
      ...school,
      _id: school._id.toString(),
    }));

    return { success: true, schools: schoolsWithStrId };
  } catch (error) {
    console.error('Get schools server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch schools.' };
  }
}
