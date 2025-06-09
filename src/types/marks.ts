
import type { ObjectId } from 'mongodb';
import { z } from 'zod';

// Represents a single mark entry for a student in a specific assessment component
export interface MarkEntry {
  _id?: ObjectId | string;
  studentId: ObjectId | string;
  studentName: string; // For easier display/denormalization
  classId: string; // ID of the class the student was in when marks were given
  className: string; // Name of the class
  subjectId: string; // Could be a formal ID or subject name as key
  subjectName: string;
  assessmentName: string; // e.g., "FA1 Tool1", "Unit Test 1", "Summative Assessment 1 - Paper 1"
  term: string; // e.g., "Term 1", "Mid-Term", "Annual"
  academicYear: string; // e.g., "2023-2024"
  marksObtained: number;
  maxMarks: number;
  markedByTeacherId: ObjectId | string;
  schoolId: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema for an individual mark being submitted by a teacher for a student
export const studentMarkInputSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  marksObtained: z.coerce.number().min(0, "Marks cannot be negative."), // Use coerce for string inputs from forms
  maxMarks: z.coerce.number().min(1, "Max marks must be at least 1."),
}).refine(data => data.marksObtained <= data.maxMarks, {
  message: "Marks obtained cannot exceed max marks.",
  path: ["marksObtained"], // Point error to marksObtained field
});
export type StudentMarkInput = z.infer<typeof studentMarkInputSchema>;

// Schema for the payload when a teacher submits marks for multiple students for a specific assessment
export const marksSubmissionPayloadSchema = z.object({
  classId: z.string().min(1, "Class ID is required."),
  className: z.string().min(1, "Class name is required."),
  subjectId: z.string().min(1, "Subject ID/Name is required."),
  subjectName: z.string().min(1, "Subject name is required."),
  assessmentName: z.string().min(1, "Assessment name is required."),
  term: z.string().min(1, "Term is required."),
  academicYear: z.string().min(4, "Academic year is required (e.g., 2023-2024)."),
  markedByTeacherId: z.string().min(1),
  schoolId: z.string().min(1),
  studentMarks: z.array(studentMarkInputSchema).min(1, "At least one student's marks must be submitted."),
});
export type MarksSubmissionPayload = z.infer<typeof marksSubmissionPayloadSchema>;

// Result type for marks submission action
export interface SubmitMarksResult {
  success: boolean;
  message: string;
  error?: string; // Contains concatenated Zod error messages or general error
  count?: number; // Number of marks entries processed/saved
}

// Result type for fetching marks
export interface GetMarksResult {
  success: boolean;
  message?: string;
  error?: string;
  marks?: MarkEntry[];
}
