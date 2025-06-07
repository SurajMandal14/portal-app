
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import * as z from 'zod';
import type { User } from '@/types/user'; // We'll create this type definition

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Basic validation
});

export interface LoginResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: Pick<User, 'email' | 'name' | 'role'>;
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

    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
    // IMPORTANT: Password Hashing and Comparison
    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
    // In a real application, passwords MUST be hashed before storing
    // and compared using a secure hashing algorithm (e.g., bcrypt).
    // For this educational step, we are doing a plain text comparison.
    // This is NOT secure for production and will be addressed when we
    // implement user registration/password management.
    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
    if (user.password !== password) {
      return { error: 'Invalid password. Please try again.', success: false };
    }

    if (user.role !== 'superadmin') {
        // For now, this login form is specifically for superadmins.
        // This can be expanded later to handle other roles.
        return { error: 'Access denied. This login is for superadmins only.', success: false };
    }

    // TODO: Implement session management (e.g., using JWT or next-auth)
    // For now, we'll just return basic user info.
    return {
      success: true,
      message: 'Login successful! Redirecting...',
      user: { email: user.email, name: user.name, role: user.role }
    };

  } catch (error) {
    console.error('Login server action error:', error);
    // Avoid leaking detailed error messages to the client
    return { error: 'An unexpected error occurred during login. Please try again later.', success: false };
  }
}
