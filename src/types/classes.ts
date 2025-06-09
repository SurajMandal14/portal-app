
import { z } from 'zod';
import type { ObjectId } from 'mongodb';

export interface SchoolClassSubject {
  // For now, subjects are just strings. Could be expanded later.
  name: string;
}

export interface SchoolClass {
  _id: ObjectId | string;
  schoolId: ObjectId | string;
  name: string; // e.g., "Grade 10 - Section A", "Class VI Blue"
  classTeacherId?: ObjectId | string | null; // Reference to User._id of the class teacher
  subjects: SchoolClassSubject[]; // List of subjects taught in this class
  createdAt: Date;
  updatedAt: Date;
}

// Schema for creating a new class
export const createClassFormSchema = z.object({
  name: z.string().min(1, { message: "Class name is required." }).max(100, { message: "Class name too long."}),
  classTeacherId: z.string().optional().nullable().or(z.literal('')), // Teacher's User ID, optional at creation
  subjects: z.array(z.object({ name: z.string().min(1, "Subject name cannot be empty.") }))
    .min(1, { message: "At least one subject is required." })
    .max(20, { message: "Maximum 20 subjects allowed."}),
});
export type CreateClassFormData = z.infer<typeof createClassFormSchema>;

// Schema for updating an existing class
export const updateClassFormSchema = createClassFormSchema.extend({}); // Same fields for update for now
export type UpdateClassFormData = z.infer<typeof updateClassFormSchema>;

// Result type for class actions
export interface SchoolClassResult {
  success: boolean;
  message: string;
  error?: string;
  class?: SchoolClass;
}

export interface SchoolClassesResult {
  success: boolean;
  message?: string;
  error?: string;
  classes?: SchoolClass[];
}
