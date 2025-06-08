
import { z } from 'zod';

export interface ClassFeeConfig {
  className: string;
  tuitionFee: number;
  busFee?: number;
  canteenFee?: number;
}

export const REPORT_CARD_TEMPLATES = {
  none: 'Default / None',
  cbse: 'CBSE Pattern',
  state_board: 'State Board Pattern',
  icse: 'ICSE Pattern',
  cambridge: 'Cambridge Pattern',
} as const;

export type ReportCardTemplateKey = keyof typeof REPORT_CARD_TEMPLATES;

export interface School {
  _id: string; // MongoDB ObjectId as string
  schoolName: string;
  schoolLogoUrl?: string; 
  classFees: ClassFeeConfig[];
  reportCardTemplate?: ReportCardTemplateKey;
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
  schoolLogo: z.any().optional(), 
  classFees: z.array(classFeeSchema).min(1, "At least one class configuration is required."),
  reportCardTemplate: z.custom<ReportCardTemplateKey>((val) => {
    return typeof val === 'string' && Object.keys(REPORT_CARD_TEMPLATES).includes(val);
  }, { message: "Invalid report card template selected." }).optional().default('none'),
});

export type SchoolFormData = z.infer<typeof schoolFormSchema>;
