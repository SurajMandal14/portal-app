
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import * as z from 'zod';
import type { User } from '@/types/user'; // We'll create this type definition
import bcrypt from 'bcryptjs'; // Import bcrypt

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Basic validation
});

export interface LoginResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: Pick<User, 'email' | 'name' | 'role' | '_id' | 'schoolId'>;
}

export async function loginUser(values: z.infer<typeof loginSchema>): Promise<LoginResult> {
  try {
    const validatedFields = loginSchema.safeParse(values);
    if (!validatedFields.success) {
      // Collect all error messages
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { error: errors || 'Invalid fields!', success: false };
    }

    const { email, password } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return { error: 'User not found. Please check your email.', success: false };
    }

    if (!user.password) {
      return { error: 'Password not set for this user. Please contact support.', success: false };
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Also try plain text comparison for users created before hashing was implemented (like initial superadmin)
      // This is a temporary measure. All passwords should eventually be hashed.
      if (user.password === password) {
        // This branch is for the initial superadmin if password was 'password' plain text
        // No action needed, password is valid in this specific fallback case
      } else {
        return { error: 'Invalid password. Please try again.', success: false };
      }
    }
    
    // At this point, login is successful.
    // We can remove role-specific login restrictions here to allow all users to login
    // and rely on UI/routing to direct them appropriately.
    // The Header component already handles role-based navigation.

    // TODO: Implement session management (e.g., using JWT or next-auth)
    // For now, we'll just return basic user info.
    return {
      success: true,
      message: 'Login successful! Redirecting...',
      user: { 
        _id: user._id.toString(),
        email: user.email, 
        name: user.name, 
        role: user.role,
        schoolId: user.schoolId?.toString() 
      }
    };

  } catch (error) {
    console.error('Login server action error:', error);
    // Avoid leaking detailed error messages to the client
    return { error: 'An unexpected error occurred during login. Please try again later.', success: false };
  }
}
