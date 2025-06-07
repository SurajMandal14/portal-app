
import { z } from 'zod';

export interface ClassFeeConfig {
  className: string;
  tuitionFee: number;
  busFee?: number;
  canteenFee?: number;
}

export interface School {
  _id: string; // MongoDB ObjectId as string
  schoolName: string;
  schoolLogoUrl?: string; // For now, we'll handle URL, not direct upload
  classFees: ClassFeeConfig[];
  // adminUserIds?: string[]; // To be added later if needed
  createdAt: Date;
  updatedAt: Date;
}

// Zod schema for class fees
export const classFeeSchema = z.object({
  className: z.string().min(1, "Class name is required"),
  tuitionFee: z.coerce.number().min(0, "Tuition fee must be positive"),
  busFee: z.coerce.number().min(0, "Bus fee must be positive").optional().default(0),
  canteenFee: z.coerce.number().min(0, "Canteen fee must be positive").optional().default(0),
});

// Zod schema for the main school form
export const schoolFormSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters."),
  schoolLogo: z.any().optional(), // File upload handled on client, actual storage not yet implemented
  classFees: z.array(classFeeSchema).min(1, "At least one class configuration is required."),
});

export type SchoolFormData = z.infer<typeof schoolFormSchema>;
