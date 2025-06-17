
import { z } from 'zod';
import type { ObjectId } from 'mongodb';

export interface SchoolClassSubject {
  name: string;
  teacherId?: string | ObjectId | null; // User._id of the teacher assigned to this subject for this class
  teacherName?: string; // For display, populated by aggregation or client-side mapping
}

// This type is for data passed to CLIENT components.
export interface SchoolClass {
  _id: string;
  schoolId: string;
  name: string;
  classTeacherId?: string | null;
  classTeacherName?: string; // From aggregation
  subjects: SchoolClassSubject[]; // Updated to use the new interface
  createdAt: string; // ISOString
  updatedAt: string; // ISOString
}

// Schema for creating a new class
export const createClassFormSchema = z.object({
  name: z.string().min(1, { message: "Class name is required." }).max(100, { message: "Class name too long."}),
  classTeacherId: z.string().optional().nullable().or(z.literal('')), // Teacher's User ID, optional at creation
  subjects: z.array(z.object({ 
      name: z.string().min(1, "Subject name cannot be empty."),
      teacherId: z.string().optional().nullable().or(z.literal('')) // Optional teacher ID for the subject
    }))
    .min(1, { message: "At least one subject is required." })
    .max(20, { message: "Maximum 20 subjects allowed."}),
});
export type CreateClassFormData = z.infer<typeof createClassFormSchema>;

// Schema for updating an existing class
export const updateClassFormSchema = createClassFormSchema.extend({});
export type UpdateClassFormData = z.infer<typeof updateClassFormSchema>;

// Result type for class actions
export interface SchoolClassResult {
  success: boolean;
  message: string;
  error?: string;
  class?: SchoolClass; // Use client-facing type
}

export interface SchoolClassesResult {
  success: boolean;
  message?: string;
  error?: string;
  classes?: SchoolClass[]; // Use client-facing type
}
