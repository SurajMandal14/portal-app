
import { z } from 'zod';

export interface TermFee {
  term: 'Term 1' | 'Term 2' | 'Term 3';
  amount: number;
}

export interface ClassTuitionFeeConfig {
  className: string; // e.g., "Nursery", "Grade 1", "Grade 10"
  terms: TermFee[];
}

// New interface for Bus Fee Structure
export interface BusFeeLocationCategory {
  location: string; // e.g., "Route A - Stop 1", "Downtown Area"
  classCategory: string; // e.g., "Nursery-UKG", "I-V", "VI-X"
  terms: TermFee[];
}

export const REPORT_CARD_TEMPLATES = {
  none: 'Default / None',
  cbse: 'CBSE Pattern',
  state_board: 'State Board Pattern',
  icse: 'ICSE Pattern',
  cambridge: 'Cambridge Pattern',
  cbse_state: 'CBSE State Pattern', // Added from report card page
} as const;

export type ReportCardTemplateKey = keyof typeof REPORT_CARD_TEMPLATES;

// Main School interface
export interface School {
  _id: string; // MongoDB ObjectId as string
  schoolName: string;
  schoolLogoUrl?: string;
  tuitionFees: ClassTuitionFeeConfig[];
  busFeeStructures?: BusFeeLocationCategory[]; // Added new field
  reportCardTemplate?: ReportCardTemplateKey;
  createdAt: Date | string; // Allow string for client-side
  updatedAt: Date | string; // Allow string for client-side
}

// Zod schema for term fees
export const termFeeSchema = z.object({
  term: z.enum(['Term 1', 'Term 2', 'Term 3']),
  amount: z.coerce.number().min(0, "Fee amount must be non-negative.").default(0),
});

// Zod schema for class tuition fees (containing terms)
export const classTuitionFeeSchema = z.object({
  className: z.string().min(1, "Class name is required"),
  terms: z.array(termFeeSchema).length(3, "Exactly 3 terms are required for tuition fees."),
});

// New Zod schema for Bus Fee Location Category
export const busFeeLocationCategorySchema = z.object({
  location: z.string().min(1, "Location name is required."),
  classCategory: z.string().min(1, "Class category is required (e.g., Nursery-UKG, I-V)."),
  terms: z.array(termFeeSchema).length(3, "Exactly 3 terms are required for bus fees."),
});

// Zod schema for the main school form
export const schoolFormSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters."),
  schoolLogoUrl: z.string().url({ message: "Please enter a valid URL for the school logo." }).optional().or(z.literal('')),
  tuitionFees: z.array(classTuitionFeeSchema).min(1, "At least one class tuition configuration is required."),
  busFeeStructures: z.array(busFeeLocationCategorySchema).optional(), // Added busFeeStructures field
  reportCardTemplate: z.custom<ReportCardTemplateKey>((val) => {
    return typeof val === 'string' && Object.keys(REPORT_CARD_TEMPLATES).includes(val);
  }, { message: "Invalid report card template selected." }).optional().default('none'),
});

export type SchoolFormData = z.infer<typeof schoolFormSchema>;
