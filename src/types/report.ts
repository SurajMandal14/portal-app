
import type { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { ReportCardTemplateKey } from './school';
import type { StudentData as FrontStudentData, MarksEntry as FrontMarksEntryType } from '@/components/report-cards/CBSEStateFront';

// Define a structure for storing FA marks that includes the subject identifier
export interface FormativeAssessmentEntryForStorage {
  subjectName: string;
  fa1: FrontMarksEntryType;
  fa2: FrontMarksEntryType;
  fa3: FrontMarksEntryType;
  fa4: FrontMarksEntryType;
}

// Structure for the 6 Assessment Skill marks for a given SA period
export interface SAPeriodMarks {
  as1: number | null;
  as2: number | null;
  as3: number | null;
  as4: number | null;
  as5: number | null;
  as6: number | null;
}

// Structure for the max marks of the 6 Assessment Skills
export interface SAMaxMarks {
  as1: number;
  as2: number;
  as3: number;
  as4: number;
  as5: number;
  as6: number;
}

// Main structure for Summative Assessment data per subject in a saved report
export interface ReportCardSASubjectEntry {
  subjectName: string; 
  sa1_marks: SAPeriodMarks;
  sa1_max_marks: SAMaxMarks;
  sa2_marks: SAPeriodMarks;
  sa2_max_marks: SAMaxMarks;
  faTotal200M: number | null; 
}


// Structure for Attendance data for storage and display
export interface ReportCardAttendanceMonth {
  workingDays: number | null;
  presentDays: number | null;
}


export interface ReportCardData {
  _id?: ObjectId | string;
  studentId: string;
  schoolId: ObjectId | string;
  academicYear: string;
  reportCardTemplateKey: ReportCardTemplateKey;
  
  studentInfo: FrontStudentData;
  formativeAssessments: FormativeAssessmentEntryForStorage[];
  coCurricularAssessments: any[];
  secondLanguage?: 'Hindi' | 'Telugu';

  summativeAssessments: ReportCardSASubjectEntry[];
  attendance: ReportCardAttendanceMonth[];
  finalOverallGrade: string | null;

  isPublished?: boolean;
  generatedByAdminId?: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
  term?: string;
}

// --- Zod Schemas for Validation ---

const saPeriodMarksSchema = z.object({
  as1: z.number().nullable(), as2: z.number().nullable(), as3: z.number().nullable(),
  as4: z.number().nullable(), as5: z.number().nullable(), as6: z.number().nullable(),
});

const saMaxMarksSchema = z.object({
  as1: z.number(), as2: z.number(), as3: z.number(),
  as4: z.number(), as5: z.number(), as6: z.number(),
});

const reportCardSASubjectEntrySchemaForSave = z.object({
  subjectName: z.string(),
  sa1_marks: saPeriodMarksSchema,
  sa1_max_marks: saMaxMarksSchema,
  sa2_marks: saPeriodMarksSchema,
  sa2_max_marks: saMaxMarksSchema,
  faTotal200M: z.number().nullable(),
});

export const reportCardDataSchemaForSave = z.object({
  studentId: z.string().min(1, "Student ID is required."),
  schoolId: z.string().min(1, "School ID is required."),
  academicYear: z.string().min(4, "Academic year is required."),
  reportCardTemplateKey: z.string().min(1, "Report card template key is required."),
  studentInfo: z.any(), 
  formativeAssessments: z.array(z.any()),
  coCurricularAssessments: z.array(z.any()),
  secondLanguage: z.enum(['Hindi', 'Telugu']).optional(),
  summativeAssessments: z.array(reportCardSASubjectEntrySchemaForSave),
  attendance: z.array(z.any()),
  finalOverallGrade: z.string().nullable(),
  generatedByAdminId: z.string().optional(),
  term: z.string().optional(),
});


// --- Server Action Result Types ---

export interface SaveReportCardResult {
  success: boolean;
  message: string;
  error?: string;
  reportCardId?: string;
  isPublished?: boolean;
}

export interface SetReportCardPublicationStatusResult {
    success: boolean;
    message: string;
    error?: string;
    isPublished?: boolean;
}

export interface GetStudentReportCardResult {
  success: boolean;
  reportCard?: ReportCardData;
  message?: string;
  error?: string;
}

export interface BulkPublishReportInfo {
  reportId: string | null;
  studentId: string;
  studentName: string;
  admissionId?: string;
  isPublished: boolean;
  hasReport: boolean;
}
