
// Basic User type definition
// This will be expanded as we add more user-specific fields.

import type { ObjectId } from 'mongodb';

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

// Added for school admin creating teachers/students
export interface CreateSchoolUserServerFormData {
  name: string;
  email: string;
  password?: string; // Required for create
  role: 'teacher' | 'student';
  schoolId: string; // Will be passed by the admin's session/context
  classId?: string; // This will be the className string from the form
}
