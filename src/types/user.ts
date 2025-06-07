
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
  // classId can store the name of the class or an ObjectId if you have a separate 'classes' collection
  // For now, we'll assume it might store the className string from School.classFees
  classId?: ObjectId | string; 
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolAdminFormData {
  name: string;
  email: string;
  password?: string; // Optional for update, required for create
  schoolId: string;
}

// Zod schema for creating/updating school users (teachers, students) by an admin
export const createSchoolUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['teacher', 'student'], { required_error: "Role is required." }),
  classId: z.string().optional(), // Optional, will store className string from form
});

export type CreateSchoolUserFormData = z.infer<typeof createSchoolUserFormSchema>;


// Added for school admin creating teachers/students
// This type might be redundant if CreateSchoolUserFormData is used on the server-side directly
// but can be useful for clarity if server-side processing differs slightly.
export interface CreateSchoolUserServerFormData {
  name: string;
  email: string;
  password?: string; // Required for create
  role: 'teacher' | 'student';
  schoolId: string; // Will be passed by the admin's session/context
  classId?: string; // This will be the className string from the form
}

