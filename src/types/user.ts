
// Basic User type definition
// This will be expanded as we add more user-specific fields.
export interface User {
  _id: string; // Or ObjectId if you prefer to use MongoDB's ObjectId type directly
  email: string;
  password?: string; // Password should ideally not be part of client-side user objects often
  name: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  schoolId?: string; // Or ObjectId
  classId?: string; // Or ObjectId
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  // Add other fields as necessary
}
