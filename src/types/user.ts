
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
