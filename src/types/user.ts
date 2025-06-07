
// Basic User type definition
// This will be expanded as we add more user-specific fields.

import type { ObjectId } from 'mongodb';
import { z } from 'zod';

export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';

export interface User {
  _id: ObjectId | string; 
  email: string;
  password?: string; 
  name: string;
  role: UserRole;
  schoolId?: ObjectId | string; 
  classId?: string; // Storing className as string for now
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Zod schema for Super Admin creating/updating School Admins
export const schoolAdminFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal('')), // Optional for update
  schoolId: z.string().min(1, { message: "School selection is required." }),
});
export type SchoolAdminFormData = z.infer<typeof schoolAdminFormSchema>;


// Zod schema for admin creating school users (teachers, students)
export const createSchoolUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['teacher', 'student'], { required_error: "Role is required." }),
  classId: z.string().optional(), 
});
export type CreateSchoolUserFormData = z.infer<typeof createSchoolUserFormSchema>;

// Zod schema for admin updating school users (teachers, students)
export const updateSchoolUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "New password must be at least 6 characters." }).optional().or(z.literal('')), // Optional for update
  role: z.enum(['teacher', 'student'], { required_error: "Role is required." }), // Role might be non-editable in UI, but schema needs it
  classId: z.string().optional(),
});
export type UpdateSchoolUserFormData = z.infer<typeof updateSchoolUserFormSchema>;


// Added for school admin creating teachers/students
export interface CreateSchoolUserServerFormData {
  name: string;
  email: string;
  password?: string; // Required for create
  role: 'teacher' | 'student';
  schoolId: string; 
  classId?: string; 
}

