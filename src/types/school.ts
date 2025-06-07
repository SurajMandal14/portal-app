
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
