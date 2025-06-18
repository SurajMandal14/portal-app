
import type { ObjectId } from 'mongodb';
import type { ReportCardTemplateKey } from './school';
import type { StudentData as FrontStudentData, MarksEntry, SubjectFAData as FrontSubjectFAData, CoCurricularSAData as FrontCoCurricularSAData } from '@/components/report-cards/CBSEStateFront';
import type { SARowData as BackSARowData, AttendanceMonthData as BackAttendanceMonthData } from '@/components/report-cards/CBSEStateBack';

// Define a structure for storing FA marks that includes the subject identifier
export interface FormativeAssessmentEntryForStorage {
  subjectName: string; // Or a unique subject ID if available and preferred
  fa1: MarksEntry;
  fa2: MarksEntry;
  fa3: MarksEntry;
  fa4: MarksEntry;
}

export interface ReportCardData {
  _id?: ObjectId | string;
  studentId: string; // Reference to the User._id of the student
  schoolId: ObjectId | string; // Reference to the School._id
  academicYear: string; // e.g., "2023-2024"
  reportCardTemplateKey: ReportCardTemplateKey; // e.g., 'cbse_state'
  
  // Data from CBSEStateFront
  studentInfo: FrontStudentData;
  formativeAssessments: FormativeAssessmentEntryForStorage[]; // Updated structure
  coCurricularAssessments: FrontCoCurricularSAData[];
  secondLanguage?: 'Hindi' | 'Telugu'; // From front page state

  // Data from CBSEStateBack
  summativeAssessments: BackSARowData[];
  attendance: BackAttendanceMonthData[];
  finalOverallGrade: string | null;

  isPublished?: boolean; // New field to control student visibility

  // Meta
  generatedByAdminId?: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
  term?: string; // Optional: e.g., "Term 1", "Annual"
}

export interface SaveReportCardResult {
  success: boolean;
  message: string;
  error?: string;
  reportCardId?: string;
  isPublished?: boolean; // Optionally return current published status
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

