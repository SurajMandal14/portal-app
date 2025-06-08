
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { School, SchoolFormData, ReportCardTemplateKey } from '@/types/school';
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

    const { schoolName, classFees, schoolLogoUrl, reportCardTemplate } = validatedFields.data;

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
      schoolLogoUrl: schoolLogoUrl || undefined, // Store as undefined if empty string
      reportCardTemplate: reportCardTemplate || 'none',
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

    const { schoolName, classFees, reportCardTemplate, schoolLogoUrl } = validatedFields.data;

    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<School>('schools');

    const updateData: Partial<Omit<School, '_id' | 'createdAt'>> = {
      schoolName,
      classFees: classFees.map(cf => ({
        className: cf.className,
        tuitionFee: cf.tuitionFee,
        busFee: cf.busFee || 0,
        canteenFee: cf.canteenFee || 0,
      })),
      reportCardTemplate: reportCardTemplate || 'none',
      updatedAt: new Date(),
    };
    
    // Only update schoolLogoUrl if it's explicitly provided in the form data
    // An empty string means clear the logo, undefined means no change intended to logo
    if (typeof schoolLogoUrl === 'string') {
      updateData.schoolLogoUrl = schoolLogoUrl || undefined; // Set to undefined if empty string to remove
    }


    const result = await schoolsCollection.updateOne(
      { _id: new ObjectId(schoolId) as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'School not found.', error: 'No school matched the provided ID.' };
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

export interface GetSchoolByIdResult {
  success: boolean;
  school?: School;
  error?: string;
  message?: string;
}

export async function getSchoolById(schoolId: string): Promise<GetSchoolByIdResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid school ID format.' };
    }

    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<School>('schools');
    
    const school = await schoolsCollection.findOne({ _id: new ObjectId(schoolId) as any });

    if (!school) {
      return { success: false, message: 'School not found.' };
    }
    
    return { success: true, school: { ...school, _id: school._id.toString() } };
  } catch (error) {
    console.error('Get school by ID server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch school details.' };
  }
}
