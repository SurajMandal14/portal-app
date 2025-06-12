
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { School, SchoolFormData, ReportCardTemplateKey, ClassTuitionFeeConfig, TermFee, BusFeeLocationCategory } from '@/types/school';
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
      const errors = validatedFields.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join('; ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { schoolName, tuitionFees, schoolLogoUrl, reportCardTemplate, busFeeStructures } = validatedFields.data;

    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<Omit<School, '_id'>>('schools');

    const newSchoolData: Omit<School, '_id' | 'createdAt' | 'updatedAt'> = {
      schoolName,
      tuitionFees: tuitionFees.map(tf => ({
        className: tf.className,
        terms: tf.terms.map(termFee => ({
          term: termFee.term,
          amount: termFee.amount,
        })),
      })),
      busFeeStructures: busFeeStructures ? busFeeStructures.map(bfs => ({ // Handle optional busFeeStructures
        location: bfs.location,
        classCategory: bfs.classCategory,
        terms: bfs.terms.map(termFee => ({
          term: termFee.term,
          amount: termFee.amount,
        })),
      })) : [], // Default to empty array if not provided
      schoolLogoUrl: schoolLogoUrl || undefined,
      reportCardTemplate: reportCardTemplate || 'none',
    };

    const schoolToInsert = {
      ...newSchoolData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await schoolsCollection.insertOne(schoolToInsert);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create school profile.', error: 'Database insertion failed.' };
    }
    
    revalidatePath('/dashboard/super-admin/schools');

    return {
      success: true,
      message: 'School profile created successfully!',
      school: { 
        ...schoolToInsert, 
        _id: result.insertedId.toString(),
        createdAt: schoolToInsert.createdAt.toISOString(), // Serialize dates
        updatedAt: schoolToInsert.updatedAt.toISOString(),
      } as School,
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
      const errors = validatedFields.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join('; ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { schoolName, tuitionFees, reportCardTemplate, schoolLogoUrl, busFeeStructures } = validatedFields.data;

    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection<School>('schools');

    const updateData: Partial<Omit<School, '_id' | 'createdAt'>> = {
      schoolName,
      tuitionFees: tuitionFees.map(tf => ({
        className: tf.className,
        terms: tf.terms.map(termFee => ({
          term: termFee.term,
          amount: termFee.amount,
        })),
      })),
      busFeeStructures: busFeeStructures ? busFeeStructures.map(bfs => ({
        location: bfs.location,
        classCategory: bfs.classCategory,
        terms: bfs.terms.map(termFee => ({
          term: termFee.term,
          amount: termFee.amount,
        })),
      })) : [],
      reportCardTemplate: reportCardTemplate || 'none',
      updatedAt: new Date(),
    };
    
    if (typeof schoolLogoUrl === 'string') {
      updateData.schoolLogoUrl = schoolLogoUrl || undefined; 
    }


    const result = await schoolsCollection.updateOne(
      { _id: new ObjectId(schoolId) as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'School not found.', error: 'No school matched the provided ID.' };
    }
    
    revalidatePath('/dashboard/super-admin/schools');
    revalidatePath(`/dashboard/admin/settings`); 
    
    const updatedSchoolDoc = await schoolsCollection.findOne({ _id: new ObjectId(schoolId) as any });
     if (!updatedSchoolDoc) return { success: false, message: 'Failed to retrieve school after update.'};
     
     const clientSchool: School = {
        ...updatedSchoolDoc,
        _id: updatedSchoolDoc._id.toString(),
        createdAt: new Date(updatedSchoolDoc.createdAt).toISOString(), 
        updatedAt: new Date(updatedSchoolDoc.updatedAt).toISOString(),
     };

    return {
      success: true,
      message: 'School profile updated successfully!',
      school: clientSchool
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
    const schoolsCollection = db.collection('schools'); 
    
    const schoolsDocs = await schoolsCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    const schools: School[] = schoolsDocs.map(doc => ({
      _id: doc._id.toString(),
      schoolName: doc.schoolName,
      schoolLogoUrl: doc.schoolLogoUrl,
      tuitionFees: (doc.tuitionFees || []).map((tf: any) => ({ 
        className: tf.className,
        terms: (tf.terms || []).map((t: any) => ({ term: t.term, amount: t.amount }))
      })),
      busFeeStructures: (doc.busFeeStructures || []).map((bfs: any) => ({ // map busFeeStructures
        location: bfs.location,
        classCategory: bfs.classCategory,
        terms: (bfs.terms || []).map((t: any) => ({ term: t.term, amount: t.amount }))
      })),
      reportCardTemplate: doc.reportCardTemplate,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    }));

    return { success: true, schools };
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
    const schoolsCollection = db.collection('schools'); 
    
    const schoolDoc = await schoolsCollection.findOne({ _id: new ObjectId(schoolId) as any });

    if (!schoolDoc) {
      return { success: false, message: 'School not found.' };
    }
    
    const school: School = {
      _id: schoolDoc._id.toString(),
      schoolName: schoolDoc.schoolName,
      schoolLogoUrl: schoolDoc.schoolLogoUrl,
      tuitionFees: (schoolDoc.tuitionFees || []).map((tf: any) => ({
        className: tf.className,
        terms: (tf.terms || []).map((t: any) => ({ term: t.term, amount: t.amount }))
      })),
      busFeeStructures: (schoolDoc.busFeeStructures || []).map((bfs: any) => ({ // map busFeeStructures
        location: bfs.location,
        classCategory: bfs.classCategory,
        terms: (bfs.terms || []).map((t: any) => ({ term: t.term, amount: t.amount }))
      })),
      reportCardTemplate: schoolDoc.reportCardTemplate,
      createdAt: new Date(schoolDoc.createdAt).toISOString(),
      updatedAt: new Date(schoolDoc.updatedAt).toISOString(),
    };
    
    return { success: true, school };
  } catch (error) {
    console.error('Get school by ID server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch school details.' };
  }
}

export interface GetSchoolsCountResult {
  success: boolean;
  count?: number;
  error?: string;
  message?: string;
}

export async function getSchoolsCount(): Promise<GetSchoolsCountResult> {
  try {
    const { db } = await connectToDatabase();
    const schoolsCollection = db.collection('schools');
    const count = await schoolsCollection.countDocuments();
    return { success: true, count };
  } catch (error) {
    console.error('Get schools count server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch schools count.' };
  }
}
