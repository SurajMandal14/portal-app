
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { School, SchoolFormData } from '@/types/school';
import { schoolFormSchema } from '@/types/school';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

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

    // For now, schoolLogoUrl will be undefined. File upload to be handled later.
    // If schoolLogo was a string (URL), you could assign it here.
    // If it's a File object, we're not handling its storage yet.
    let schoolLogoUrl: string | undefined = undefined;
    if (typeof schoolLogo === 'string' && schoolLogo.startsWith('http')) {
      schoolLogoUrl = schoolLogo;
    }
    // Note: Actual file object handling for 'schoolLogo' requires a different approach (e.g., upload to storage service)

    const newSchoolData: Omit<School, '_id'> = {
      schoolName,
      classFees: classFees.map(cf => ({
        className: cf.className,
        tuitionFee: cf.tuitionFee,
        busFee: cf.busFee || 0,
        canteenFee: cf.canteenFee || 0,
      })),
      schoolLogoUrl: schoolLogoUrl, // Placeholder, actual upload not implemented
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await schoolsCollection.insertOne(newSchoolData);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create school profile.', error: 'Database insertion failed.' };
    }
    
    revalidatePath('/dashboard/super-admin/schools');

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

export interface UpdateSchoolResult {
  success: boolean;
  message: string;
  error?: string;
  school?: School;
}

export async function updateSchool(schoolId: string, values: SchoolFormData): Promise<UpdateSchoolResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid school ID format.' };
    }

    const validatedFields = schoolFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { schoolName, classFees, schoolLogo } = validatedFields.data;

    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<School>('schools');

    // Similar to createSchool, logo handling is simplified.
    // In a real app, if schoolLogo is a File, you'd upload it and get a new URL.
    // If schoolLogo is undefined/null, you might want to keep the existing one or clear it.
    // For this update, we'll only update schoolName and classFees and updatedAt.
    // schoolLogoUrl is not updated here to keep it simple without file upload logic.

    const updateData = {
      schoolName,
      classFees: classFees.map(cf => ({
        className: cf.className,
        tuitionFee: cf.tuitionFee,
        busFee: cf.busFee || 0,
        canteenFee: cf.canteenFee || 0,
      })),
      updatedAt: new Date(),
    };

    const result = await schoolsCollection.updateOne(
      { _id: new ObjectId(schoolId) as any }, // Casting to any to match MongoDB driver type for _id
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'School not found.', error: 'No school matched the provided ID.' };
    }
    if (result.modifiedCount === 0) {
      // This could mean the data submitted was identical to existing data
      // Or an issue occurred. For simplicity, we'll treat it as potentially "no change made".
      revalidatePath('/dashboard/super-admin/schools');
      // Fetch the potentially unchanged school to return it
      const updatedSchool = await schoolsCollection.findOne({ _id: new ObjectId(schoolId) as any });
      if (!updatedSchool) return { success: false, message: 'Failed to retrieve school after update attempt.'};

      return { success: true, message: 'No changes detected or school data already up-to-date.', school: { ...updatedSchool, _id: updatedSchool._id.toString() }};
    }
    
    revalidatePath('/dashboard/super-admin/schools');
    
    const updatedSchool = await schoolsCollection.findOne({ _id: new ObjectId(schoolId) as any });
     if (!updatedSchool) return { success: false, message: 'Failed to retrieve school after update.'};


    return {
      success: true,
      message: 'School profile updated successfully!',
      school: { ...updatedSchool, _id: updatedSchool._id.toString() }
    };

  } catch (error) {
    console.error('Update school server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during school update.', error: errorMessage };
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
