
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, UserRole } from '@/types/user';
import { createSchoolUserFormSchema, type CreateSchoolUserFormData, updateSchoolUserFormSchema, type UpdateSchoolUserFormData, type CreateSchoolUserServerActionFormData } from '@/types/user';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';


export interface CreateSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
  user?: Partial<User>;
}

export async function createSchoolUser(values: CreateSchoolUserServerActionFormData, schoolId: string): Promise<CreateSchoolUserResult> {
  try {
    // Validate against the more comprehensive schema that includes student-specific new fields
    const validatedFields = createSchoolUserFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID provided for user creation.', error: 'Invalid School ID.'};
    }

    const { 
        name, email, password, role, classId, admissionId, 
        busRouteLocation, busClassCategory,
        fatherName, motherName, dob, section, rollNo, examNo, aadharNo, dateOfJoining
    } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<Omit<User, '_id'>>('users');

    const existingUserByEmail = await usersCollection.findOne({ email });
    if (existingUserByEmail) {
      return { success: false, message: 'User with this email already exists.', error: 'Email already in use.' };
    }

    if (role === 'student' && admissionId) {
        const existingUserByAdmissionId = await usersCollection.findOne({ admissionId, schoolId: new ObjectId(schoolId), role: 'student' });
        if (existingUserByAdmissionId) {
            return { success: false, message: `Admission ID '${admissionId}' is already in use for another student in this school.`, error: 'Admission ID already taken.' };
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userSchoolId = new ObjectId(schoolId);

    const newUser: Omit<User, '_id' | 'createdAt' | 'updatedAt'> & { createdAt: Date, updatedAt: Date } = {
      name,
      email,
      password: hashedPassword,
      role: role as UserRole,
      status: 'active',
      schoolId: userSchoolId,
      classId: (classId && classId.trim() !== "" && ObjectId.isValid(classId)) ? classId.trim() : undefined,
      admissionId: role === 'student' ? (admissionId && admissionId.trim() !== "" ? admissionId.trim() : undefined) : undefined,
      busRouteLocation: role === 'student' ? (busRouteLocation && busRouteLocation.trim() !== "" ? busRouteLocation.trim() : undefined) : undefined,
      busClassCategory: role === 'student' ? (busClassCategory && busClassCategory.trim() !== "" ? busClassCategory.trim() : undefined) : undefined,
      // New fields
      fatherName: role === 'student' ? fatherName : undefined,
      motherName: role === 'student' ? motherName : undefined,
      dob: role === 'student' ? dob : undefined,
      section: role === 'student' ? section : undefined,
      rollNo: role === 'student' ? rollNo : undefined,
      examNo: role === 'student' ? examNo : undefined,
      aadharNo: role === 'student' ? aadharNo : undefined,
      dateOfJoining: dateOfJoining || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create user.', error: 'Database insertion failed.' };
    }

    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/teachers');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = newUser;
    return {
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`,
      user: {
        ...userWithoutPassword,
        _id: result.insertedId.toString(),
        schoolId: userSchoolId.toString(),
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      },
    };

  } catch (error) {
    console.error('Create school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user creation.', error: errorMessage };
  }
}

export interface GetSchoolUsersResult {
  success: boolean;
  users?: Partial<User>[];
  error?: string;
  message?: string;
}

export async function getSchoolUsers(schoolId: string): Promise<GetSchoolUsersResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID format for fetching users.', error: 'Invalid School ID.'};
    }
    const { db } = await connectToDatabase();

    const usersFromDb = await db.collection('users').find({
      schoolId: new ObjectId(schoolId) as any,
      role: { $in: ['teacher', 'student'] }
    }).sort({ createdAt: -1 }).toArray();

    const users = usersFromDb.map(userDoc => {
      const user = userDoc as unknown as User; 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        _id: user._id.toString(),
        schoolId: user.schoolId?.toString(),
        classId: user.classId || undefined, 
        admissionId: user.admissionId || undefined,
        status: user.status || 'active',
        busRouteLocation: user.busRouteLocation || undefined,
        busClassCategory: user.busClassCategory || undefined,
        fatherName: user.fatherName,
        motherName: user.motherName,
        dob: user.dob,
        section: user.section,
        rollNo: user.rollNo,
        examNo: user.examNo,
        aadharNo: user.aadharNo,
        dateOfJoining: user.dateOfJoining,
        dateOfLeaving: user.dateOfLeaving,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : undefined,
      };
    });

    return { success: true, users };
  } catch (error) {
    console.error('Get school users server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch school users.' };
  }
}


export interface UpdateSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
  user?: Partial<User>;
}

export async function updateSchoolUser(userId: string, schoolId: string, values: UpdateSchoolUserFormData): Promise<UpdateSchoolUserResult> {
  try {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid User or School ID format.', error: 'Invalid ID.' };
    }

    const validatedFields = updateSchoolUserFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { 
        name, email, password, role, classId, admissionId, 
        enableBusTransport, busRouteLocation, busClassCategory,
        fatherName, motherName, dob, section, rollNo, examNo, aadharNo, dateOfJoining, dateOfLeaving
    } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
    if (!existingUser || existingUser.schoolId?.toString() !== schoolId) {
      return { success: false, message: 'User not found or does not belong to this school.', error: 'User mismatch.' };
    }

    const existingUserByEmail = await usersCollection.findOne({ email });
    if (existingUserByEmail && existingUserByEmail._id.toString() !== userId) {
      return { success: false, message: 'This email is already in use by another account.', error: 'Email already in use.' };
    }

    if (role === 'student' && admissionId && admissionId.trim() !== "") {
        const existingUserByAdmissionId = await usersCollection.findOne({
            admissionId,
            schoolId: new ObjectId(schoolId),
            role: 'student',
            _id: { $ne: new ObjectId(userId) as any }
        });
        if (existingUserByAdmissionId) {
            return { success: false, message: `Admission ID '${admissionId}' is already in use for another student in this school.`, error: 'Admission ID already taken.' };
        }
    }

    const updateData: Partial<Omit<User, '_id' | 'role' | 'createdAt'>> & { role?: UserRole; updatedAt: Date } = {
      name,
      email,
      classId: (classId && classId.trim() !== "" && ObjectId.isValid(classId)) ? classId.trim() : undefined,
      updatedAt: new Date(),
      dateOfJoining: dateOfJoining || undefined,
      dateOfLeaving: dateOfLeaving || undefined,
    };

    if (role && (role === 'teacher' || role === 'student')) {
        updateData.role = role; 
        if (role === 'student') {
            updateData.admissionId = admissionId && admissionId.trim() !== "" ? admissionId.trim() : undefined;
            updateData.busRouteLocation = enableBusTransport && busRouteLocation && busRouteLocation.trim() !== "" ? busRouteLocation.trim() : undefined;
            updateData.busClassCategory = enableBusTransport && busClassCategory && busClassCategory.trim() !== "" ? busClassCategory.trim() : undefined;
             if (!enableBusTransport) { 
                updateData.busRouteLocation = undefined;
                updateData.busClassCategory = undefined;
            }
            updateData.fatherName = fatherName;
            updateData.motherName = motherName;
            updateData.dob = dob;
            updateData.section = section;
            updateData.rollNo = rollNo;
            updateData.examNo = examNo;
            updateData.aadharNo = aadharNo;
        } else { 
            updateData.admissionId = undefined;
            updateData.busRouteLocation = undefined;
            updateData.busClassCategory = undefined;
            updateData.fatherName = undefined;
            updateData.motherName = undefined;
            updateData.dob = undefined;
            updateData.section = undefined;
            updateData.rollNo = undefined;
            updateData.examNo = undefined;
            updateData.aadharNo = undefined;
        }
    }


    if (password && password.trim() !== "") {
      if (password.length < 6) {
         return { success: false, message: 'Validation failed', error: 'New password must be at least 6 characters.' };
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any, schoolId: new ObjectId(schoolId) as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'User not found for update.', error: 'User not found.' };
    }

    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/teachers');

    const updatedUserDoc = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
    if (!updatedUserDoc) {
      return { success: false, message: 'Failed to retrieve user after update.', error: 'Could not fetch updated user.' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = updatedUserDoc;

    return {
      success: true,
      message: 'User updated successfully!',
      user: {
        ...userWithoutPassword,
        _id: updatedUserDoc._id.toString(),
        schoolId: updatedUserDoc.schoolId?.toString(),
      }
    };

  } catch (error) {
    console.error('Update school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user update.', error: errorMessage };
  }
}

export interface DeleteSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function deleteSchoolUser(userId: string, schoolId: string): Promise<DeleteSchoolUserResult> {
  try {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid User or School ID format.', error: 'Invalid ID.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const result = await usersCollection.deleteOne({
      _id: new ObjectId(userId) as any,
      schoolId: new ObjectId(schoolId) as any,
      role: { $in: ['teacher', 'student'] }
    });

    if (result.deletedCount === 0) {
      return { success: false, message: 'User not found or already deleted.', error: 'User not found.' };
    }

    revalidatePath('/dashboard/admin/users');
    return { success: true, message: 'User permanently deleted successfully!' };

  } catch (error) {
    console.error('Delete school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user deletion.', error: errorMessage };
  }
}

export interface UpdateUserStatusResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function updateUserStatus(userId: string, schoolId: string, status: 'active' | 'discontinued'): Promise<UpdateUserStatusResult> {
  try {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid User or School ID format.', error: 'Invalid ID.' };
    }
    if (status !== 'active' && status !== 'discontinued') {
      return { success: false, message: 'Invalid status provided.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any, schoolId: new ObjectId(schoolId) as any },
      { $set: { status: status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'User not found.', error: 'User not found.' };
    }

    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/teachers');

    return { success: true, message: `User status successfully updated to ${status}.` };

  } catch (error) {
    console.error('Update user status server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during status update.', error: errorMessage };
  }
}


export async function getStudentsByClass(schoolId: string, classId: string): Promise<GetSchoolUsersResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const studentsFromDb = await usersCollection.find({
      schoolId: new ObjectId(schoolId) as any,
      classId: classId, // classId is now the _id (string)
      role: 'student'
    }).project({ password: 0 }).sort({ name: 1 }).toArray();

    const users = studentsFromDb.map(studentDoc => {
      const student = studentDoc as unknown as User;
      return {
        ...student,
        _id: student._id.toString(),
        schoolId: student.schoolId?.toString(),
      };
    });

    return { success: true, users: users };
  } catch (error) {
    console.error('Get students by class server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch students for the class.' };
  }
}

export interface SchoolUserRoleCounts {
  students: number;
  teachers: number;
}
export interface GetSchoolUserRoleCountsResult {
  success: boolean;
  counts?: SchoolUserRoleCounts;
  error?: string;
  message?: string;
}

export async function getSchoolUserRoleCounts(schoolId: string): Promise<GetSchoolUserRoleCountsResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.' };
    }
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const studentCount = await usersCollection.countDocuments({ schoolId: new ObjectId(schoolId) as any, role: 'student' });
    const teacherCount = await usersCollection.countDocuments({ schoolId: new ObjectId(schoolId) as any, role: 'teacher' });

    return { success: true, counts: { students: studentCount, teachers: teacherCount } };
  } catch (error) {
    console.error('Get school user role counts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch user role counts.' };
  }
}

export interface GetStudentCountByClassResult {
  success: boolean;
  count?: number;
  error?: string;
  message?: string;
}

export async function getStudentCountByClass(schoolId: string, classId: string): Promise<GetStudentCountByClassResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const count = await usersCollection.countDocuments({
      schoolId: new ObjectId(schoolId) as any,
      classId: classId, // classId is the _id (string)
      role: 'student'
    });

    return { success: true, count };
  } catch (error) {
    console.error('Get student count by class server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch student count for the class.' };
  }
}

export interface StudentDetailsForReportCard {
    _id: string; 
    name: string;
    admissionId?: string;
    classId?: string; 
    schoolId?: string; 
    // New fields
    fatherName?: string;
    motherName?: string;
    dob?: string;
    section?: string;
    rollNo?: string;
    examNo?: string;
    aadharNo?: string;
    udiseCodeSchoolName?: string; // Placeholder for school name
}
export interface GetStudentDetailsForReportCardResult {
  success: boolean;
  student?: StudentDetailsForReportCard;
  error?: string;
  message?: string;
}

export async function getStudentDetailsForReportCard(admissionIdQuery: string, schoolIdQuery: string): Promise<GetStudentDetailsForReportCardResult> {
  try {
    if (!admissionIdQuery || admissionIdQuery.trim() === "") {
      return { success: false, message: 'Admission ID cannot be empty.', error: 'Invalid Admission ID.' };
    }
    if (!ObjectId.isValid(schoolIdQuery)) {
      return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const studentDoc = await usersCollection.findOne({ 
        admissionId: admissionIdQuery, 
        schoolId: new ObjectId(schoolIdQuery) as any,
        role: 'student' 
    });

    if (!studentDoc) {
      return { success: false, message: `Student with Admission ID '${admissionIdQuery}' not found in this school.`, error: 'Student not found.' };
    }
    
    const student = studentDoc as User; // Type assertion

    const studentDetails: StudentDetailsForReportCard = {
      _id: student._id.toString(), 
      name: student.name,
      admissionId: student.admissionId,
      classId: student.classId, 
      schoolId: student.schoolId?.toString(),
      fatherName: student.fatherName,
      motherName: student.motherName,
      dob: student.dob,
      section: student.section,
      rollNo: student.rollNo,
      examNo: student.examNo,
      aadharNo: student.aadharNo,
    };

    return { success: true, student: studentDetails };
  } catch (error) {
    console.error('Get student details for report card by admission ID error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch student details for report card.' };
  }
}
