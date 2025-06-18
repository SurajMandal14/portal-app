
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { ReportCardData, SaveReportCardResult, SetReportCardPublicationStatusResult, GetStudentReportCardResult } from '@/types/report';
import { ObjectId } from 'mongodb';
import type { User } from '@/types/user'; // For admin validation if needed

// Basic validation for the incoming payload - can be expanded
const reportCardDataSchemaForSave = z.object({
  studentId: z.string().min(1, "Student ID is required."),
  schoolId: z.string().min(1, "School ID is required."),
  academicYear: z.string().min(4, "Academic year is required."),
  reportCardTemplateKey: z.string().min(1, "Report card template key is required."),
  studentInfo: z.any(), 
  formativeAssessments: z.array(z.any()),
  coCurricularAssessments: z.array(z.any()),
  secondLanguage: z.enum(['Hindi', 'Telugu']).optional(),
  summativeAssessments: z.array(z.any()),
  attendance: z.array(z.any()),
  finalOverallGrade: z.string().nullable(),
  generatedByAdminId: z.string().optional(),
  term: z.string().optional(),
  // isPublished is NOT part of the save payload from the UI directly,
  // it's managed by a separate action or set to false on creation.
});


export async function saveReportCard(data: Omit<ReportCardData, '_id' | 'createdAt' | 'updatedAt' | 'isPublished'>): Promise<SaveReportCardResult> {
  try {
    const validatedData = reportCardDataSchemaForSave.safeParse(data);
    if (!validatedData.success) {
      const errors = validatedData.error.errors.map(e => e.message).join('; ');
      return { success: false, message: 'Validation failed', error: errors };
    }

    const { db } = await connectToDatabase();
    const reportCardsCollection = db.collection('report_cards');

    const { studentId, schoolId: schoolIdStr, academicYear, reportCardTemplateKey, studentInfo, formativeAssessments, coCurricularAssessments, secondLanguage, summativeAssessments, attendance, finalOverallGrade, generatedByAdminId: adminIdStr, term } = validatedData.data;
    
    const reportBaseData = {
        studentId,
        schoolId: new ObjectId(schoolIdStr),
        academicYear,
        reportCardTemplateKey,
        studentInfo,
        formativeAssessments,
        coCurricularAssessments,
        secondLanguage,
        summativeAssessments,
        attendance,
        finalOverallGrade,
        generatedByAdminId: adminIdStr ? new ObjectId(adminIdStr) : undefined,
        term,
        updatedAt: new Date(),
    };


    const existingReport = await reportCardsCollection.findOne({
        studentId: reportBaseData.studentId,
        schoolId: reportBaseData.schoolId,
        academicYear: reportBaseData.academicYear,
        reportCardTemplateKey: reportBaseData.reportCardTemplateKey,
        term: reportBaseData.term 
    });

    if (existingReport) {
        // Update existing report - DO NOT change isPublished here
        const result = await reportCardsCollection.updateOne(
            { _id: existingReport._id as ObjectId },
            { $set: reportBaseData }
        );
        if (result.modifiedCount === 0 && result.matchedCount === 0) {
             return { success: false, message: 'Failed to update report card. Report not found after initial check, or no changes made.' };
        }
         return { 
            success: true, 
            message: 'Report card updated successfully!', 
            reportCardId: existingReport._id.toString(),
            isPublished: (existingReport as ReportCardData).isPublished || false, // Return current status
        };

    } else {
        // Insert new report with isPublished: false
        const reportToInsertWithStatus: Omit<ReportCardData, '_id'> = {
            ...reportBaseData,
            isPublished: false, // Default to not published
            createdAt: new Date(),
        };
        const result = await reportCardsCollection.insertOne(reportToInsertWithStatus as any);
        if (!result.insertedId) {
          return { success: false, message: 'Failed to save report card.', error: 'Database insertion failed.' };
        }
        return { 
            success: true, 
            message: 'Report card saved successfully!', 
            reportCardId: result.insertedId.toString(),
            isPublished: false,
        };
    }

  } catch (error) {
    console.error('Save report card server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during report card saving.', error: errorMessage };
  }
}


export async function setReportCardPublicationStatus(
  reportCardId: string,
  adminSchoolId: string, // The school ID of the admin performing the action
  isPublished: boolean
): Promise<SetReportCardPublicationStatusResult> {
  try {
    if (!ObjectId.isValid(reportCardId) || !ObjectId.isValid(adminSchoolId)) {
      return { success: false, message: 'Invalid Report Card ID or Admin School ID format.' };
    }

    const { db } = await connectToDatabase();
    const reportCardsCollection = db.collection<ReportCardData>('report_cards');

    const reportToUpdate = await reportCardsCollection.findOne({ 
      _id: new ObjectId(reportCardId),
      schoolId: new ObjectId(adminSchoolId) // Ensure admin can only publish for their school
    });

    if (!reportToUpdate) {
      return { success: false, message: 'Report card not found or access denied.' };
    }

    const result = await reportCardsCollection.updateOne(
      { _id: new ObjectId(reportCardId) },
      { $set: { isPublished: isPublished, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'Report card not found during update.' };
    }
    if (result.modifiedCount === 0 && result.matchedCount > 0) {
       return { success: true, message: `Report card is already ${isPublished ? 'published' : 'unpublished'}.`, isPublished };
    }

    return { success: true, message: `Report card ${isPublished ? 'published' : 'unpublished'} successfully.`, isPublished };

  } catch (error) {
    console.error('Set report card publication status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred.', error: errorMessage };
  }
}


export async function getStudentReportCard(
  studentId: string, 
  schoolId: string, 
  academicYear: string,
  term?: string, // Optional term filter
  publishedOnly?: boolean // New parameter
): Promise<GetStudentReportCardResult> {
  try {
    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid student or school ID format.' };
    }

    const { db } = await connectToDatabase();
    const reportCardsCollection = db.collection<ReportCardData>('report_cards');

    const query: any = {
      studentId: studentId,
      schoolId: new ObjectId(schoolId),
      academicYear: academicYear,
      reportCardTemplateKey: 'cbse_state',
    };

    if (term) {
      query.term = term;
    }

    if (publishedOnly) {
      query.isPublished = true;
    }

    const reportCardDoc = await reportCardsCollection.findOne(query, {
      sort: { updatedAt: -1 }, 
    });

    if (!reportCardDoc) {
      if (publishedOnly) {
        return { success: false, message: 'Report card is not yet published or does not exist for the selected criteria.' };
      }
      return { success: false, message: 'No report card found for the specified criteria.' };
    }
    
    const reportCard: ReportCardData = {
        ...reportCardDoc,
        _id: reportCardDoc._id?.toString(),
        schoolId: reportCardDoc.schoolId.toString(),
        generatedByAdminId: reportCardDoc.generatedByAdminId?.toString(),
        isPublished: reportCardDoc.isPublished === undefined ? false : reportCardDoc.isPublished, // Default to false if undefined
        createdAt: reportCardDoc.createdAt ? new Date(reportCardDoc.createdAt) : undefined,
        updatedAt: reportCardDoc.updatedAt ? new Date(reportCardDoc.updatedAt) : undefined,
    };


    return { success: true, reportCard };

  } catch (error)
{
    console.error('Get student report card error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch student report card.' };
  }
}
