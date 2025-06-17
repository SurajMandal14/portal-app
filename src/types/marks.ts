
import type { ObjectId } from 'mongodb';
import { z } from 'zod';

// Represents a single mark entry for a student in a specific assessment component
export interface MarkEntry {
  _id?: ObjectId | string;
  studentId: ObjectId | string;
  studentName: string; 
  classId: string; 
  className: string; 
  subjectId: string; // Stores subject name
  subjectName: string;
  assessmentName: string; // e.g., "FA1-Tool1", "Unit Test 1"
  term: string; 
  academicYear: string; 
  marksObtained: number;
  maxMarks: number;
  markedByTeacherId: ObjectId | string;
  schoolId: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema for an individual mark being submitted by a teacher for a student
// This schema is now more generic. The specific assessmentName (e.g., "FA1-Tool1") will be part of this.
export const studentMarkInputSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  assessmentName: z.string().min(1, "Internal assessment name (e.g., FA1-Tool1) is required."), // Key change: assessment name per entry
  marksObtained: z.coerce.number().min(0, "Marks cannot be negative."),
  maxMarks: z.coerce.number().min(1, "Max marks must be at least 1."),
  // Temporary field, won't be saved in DB with this name, used by UI.
  // Will be mapped to `assessmentName` in the payload for `submitMarks`.
  _internalAssessmentName: z.string().optional(), 
}).refine(data => data.marksObtained <= data.maxMarks, {
  message: "Marks obtained cannot exceed max marks.",
  path: ["marksObtained"], 
});
export type StudentMarkInput = z.infer<typeof studentMarkInputSchema>;


// Schema for the payload when a teacher submits marks for multiple students
// The top-level assessmentName, subjectId are for context; actual assessment name per mark is in studentMarks array.
export const marksSubmissionPayloadSchema = z.object({
  classId: z.string().min(1, "Class ID is required."),
  className: z.string().min(1, "Class name is required."),
  subjectId: z.string().min(1, "Subject ID/Name is required."), // This will be subject name
  subjectName: z.string().min(1, "Subject name is required."),
  // assessmentName: z.string().min(1, "Overall assessment context (e.g., FA1) is required."), // This might be redundant if each entry has its own
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
  error?: string; 
  count?: number; 
}

// Result type for fetching marks
export interface GetMarksResult {
  success: boolean;
  message?: string;
  error?: string;
  marks?: MarkEntry[];
}

