
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@/types/user';
import type { AttendanceRecord } from '@/types/attendance';
import type { FeePayment } from '@/types/fees';
import type { School } from '@/types/school';
import { getStudentAttendanceRecords } from '@/app/actions/attendance';
import { getFeePaymentsByStudent } from '@/app/actions/fees';
import { getSchoolById } from '@/app/actions/schools';
import { useToast } from '@/hooks/use-toast';

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  percentage: number;
  total: number;
}

interface FeeSummary {
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  percentagePaid: number;
}

interface StudentDataContextType {
  authUser: AuthUser | null;
  attendanceSummary: AttendanceSummary;
  feeSummary: FeeSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  schoolDetails: School | null;
}

const StudentDataContext = createContext<StudentDataContextType | undefined>(undefined);

export const useStudentData = (): StudentDataContextType => {
  const context = useContext(StudentDataContext);
  if (!context) {
    throw new Error('useStudentData must be used within a StudentDataProvider');
  }
  return context;
};

interface StudentDataProviderProps {
  children: ReactNode;
}

export const StudentDataProvider = ({ children }: StudentDataProviderProps) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    present: 0, absent: 0, late: 0, percentage: 0, total: 0
  });
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          setError("Invalid user session for student data.");
        }
      } catch (e) {
        setAuthUser(null);
        setError("Failed to parse user session.");
        console.error("StudentDataProvider: Failed to parse user from localStorage:", e);
      }
    } else {
      setAuthUser(null);
      setError("No user session found.");
    }
  }, []);

  const calculateTotalFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig) return 0;
    const classFeeConfig = schoolConfig.classFees.find(cf => cf.className === className);
    if (!classFeeConfig) return 0;
    return (classFeeConfig.tuitionFee || 0) + (classFeeConfig.busFee || 0) + (classFeeConfig.canteenFee || 0);
  }, []);

  const fetchAllStudentData = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoading(false);
      setError(authUser ? "Missing student ID or School ID." : "User not authenticated for student data.");
      setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      setFeeSummary(null);
      setSchoolDetails(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [attendanceResult, feePaymentsResult, schoolResult] = await Promise.all([
        getStudentAttendanceRecords(authUser._id.toString(), authUser.schoolId.toString()),
        getFeePaymentsByStudent(authUser._id.toString(), authUser.schoolId.toString()),
        getSchoolById(authUser.schoolId.toString())
      ]);

      // Process School Details
      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "School Info Error", description: schoolResult.message || "Could not load school details." });
        setSchoolDetails(null);
      }
      
      // Process Attendance
      if (attendanceResult.success && attendanceResult.records) {
        const records = attendanceResult.records;
        const totalDays = records.length;
        if (totalDays > 0) {
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;
          const late = records.filter(r => r.status === 'late').length;
          const attendedDays = present + late;
          const percentage = Math.round((attendedDays / totalDays) * 100);
          setAttendanceSummary({ present, absent, late, percentage, total: totalDays });
        } else {
          setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
        }
      } else {
        toast({ variant: "warning", title: "Attendance Info", description: attendanceResult.message || "Could not fetch attendance data." });
        setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      }

      // Process Fees (dependent on schoolDetails being set first)
      if (schoolResult.success && schoolResult.school) {
        const currentSchoolDetails = schoolResult.school;
        const studentPayments = feePaymentsResult.success && feePaymentsResult.payments ? feePaymentsResult.payments : [];
        
        if (authUser.classId) {
            const totalFee = calculateTotalFee(authUser.classId as string, currentSchoolDetails);
            const totalPaid = studentPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
            const totalDue = totalFee - totalPaid;
            const percentagePaid = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;
            setFeeSummary({ totalFee, totalPaid, totalDue, percentagePaid });
        } else {
            setFeeSummary({ totalFee: 0, totalPaid: 0, totalDue: 0, percentagePaid: 0 });
            toast({ variant: "info", title: "Fee Info", description: "You are not assigned to a class, so fee details cannot be calculated." });
        }
      } else {
        // If school details failed, fee calculation cannot proceed accurately
        setFeeSummary(null);
      }

    } catch (fetchError) {
      console.error("StudentDataProvider: Error fetching dashboard data:", fetchError);
      setError("An unexpected error occurred fetching dashboard data.");
      toast({ variant: "destructive", title: "Dashboard Error", description: "Could not load your information." });
      setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      setFeeSummary(null);
      setSchoolDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast, calculateTotalFee]);
  
  useEffect(() => {
    if (authUser?._id && authUser?.schoolId) {
      fetchAllStudentData();
    } else if (!authUser && localStorage.getItem('loggedInUser') === null) { 
      // Only set loading to false if we are sure there's no user and not just waiting for authUser state to update
      setIsLoading(false);
    }
    // No explicit dependency on fetchAllStudentData to prevent re-runs if its identity changes too often initially
  }, [authUser]);


  const refreshData = useCallback(() => {
    if (authUser?._id && authUser?.schoolId) {
      fetchAllStudentData();
    }
  }, [authUser, fetchAllStudentData]);

  return (
    <StudentDataContext.Provider value={{ 
        authUser, 
        attendanceSummary, 
        feeSummary, 
        isLoading, 
        error, 
        refreshData,
        schoolDetails
    }}>
      {children}
    </StudentDataContext.Provider>
  );
};
