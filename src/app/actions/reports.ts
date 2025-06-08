
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { ReportCardData, SaveReportCardResult } from '@/types/report';
import { ObjectId } from 'mongodb';

// Basic validation for the incoming payload - can be expanded
const reportCardDataSchemaForSave = z.object({
  studentId: z.string().min(1, "Student ID is required."),
  schoolId: z.string().min(1, "School ID is required."),
  academicYear: z.string().min(4, "Academic year is required."),
  reportCardTemplateKey: z.string().min(1, "Report card template key is required."),
  studentInfo: z.any(), // Define more specific schemas later if needed for validation
  formativeAssessments: z.array(z.any()),
  coCurricularAssessments: z.array(z.any()),
  secondLanguage: z.enum(['Hindi', 'Telugu']).optional(),
  summativeAssessments: z.array(z.any()),
  attendance: z.array(z.any()),
  finalOverallGrade: z.string().nullable(),
  generatedByAdminId: z.string().optional(),
  term: z.string().optional(),
});


export async function saveReportCard(data: Omit<ReportCardData, '_id' | 'createdAt' | 'updatedAt'>): Promise<SaveReportCardResult> {
  try {
    const validatedData = reportCardDataSchemaForSave.safeParse(data);
    if (!validatedData.success) {
      const errors = validatedData.error.errors.map(e => e.message).join('; ');
      return { success: false, message: 'Validation failed', error: errors };
    }

    const { db } = await connectToDatabase();
    const reportCardsCollection = db.collection('report_cards');

    const reportToInsert: ReportCardData = {
      ...validatedData.data,
      studentId: validatedData.data.studentId, // Already string
      schoolId: new ObjectId(validatedData.data.schoolId),
      generatedByAdminId: validatedData.data.generatedByAdminId ? new ObjectId(validatedData.data.generatedByAdminId) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // For now, always insert. Update logic can be added later.
    // Example: Find existing by studentId, academicYear, term, templateKey
    const existingReport = await reportCardsCollection.findOne({
        studentId: reportToInsert.studentId,
        schoolId: reportToInsert.schoolId,
        academicYear: reportToInsert.academicYear,
        reportCardTemplateKey: reportToInsert.reportCardTemplateKey,
        term: reportToInsert.term // if term is a key identifier
    });

    if (existingReport) {
        // Update existing report
        const result = await reportCardsCollection.updateOne(
            { _id: existingReport._id },
            { $set: { ...reportToInsert, updatedAt: new Date() } }
        );
        if (result.modifiedCount === 0 && result.matchedCount === 0) {
             return { success: false, message: 'Failed to update report card. Report not found after initial check, or no changes made.' };
        }
         return { 
            success: true, 
            message: 'Report card updated successfully!', 
            reportCardId: existingReport._id.toString() 
        };

    } else {
        // Insert new report
        const result = await reportCardsCollection.insertOne(reportToInsert as any);
        if (!result.insertedId) {
          return { success: false, message: 'Failed to save report card.', error: 'Database insertion failed.' };
        }
        return { 
            success: true, 
            message: 'Report card saved successfully!', 
            reportCardId: result.insertedId.toString() 
        };
    }

  } catch (error) {
    console.error('Save report card server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during report card saving.', error: errorMessage };
  }
}
