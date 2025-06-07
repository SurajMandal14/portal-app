
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, CheckSquare, Percent, BookOpen, UserCircle, Loader2, CalendarClock, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getStudentAttendanceRecords } from "@/app/actions/attendance";
import { getFeePaymentsByStudent } from "@/app/actions/fees";
import { getSchoolById } from "@/app/actions/schools";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";
import type { FeePayment } from "@/types/fees";
import type { School } from "@/types/school";


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


export default function StudentDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    present: 0, absent: 0, late: 0, percentage: 0, total: 0
  });
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a student to view this page." });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        setAuthUser(null);
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const calculateTotalFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig) return 0;
    const classFeeConfig = schoolConfig.classFees.find(cf => cf.className === className);
    if (!classFeeConfig) return 0;
    return (classFeeConfig.tuitionFee || 0) + (classFeeConfig.busFee || 0) + (classFeeConfig.canteenFee || 0);
  }, []);

  const fetchAllStudentData = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [attendanceResult, feePaymentsResult, schoolResult] = await Promise.all([
        getStudentAttendanceRecords(authUser._id.toString(), authUser.schoolId.toString()),
        getFeePaymentsByStudent(authUser._id.toString(), authUser.schoolId.toString()),
        getSchoolById(authUser.schoolId.toString())
      ]);

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

      // Process Fees
      if (schoolResult.success && schoolResult.school) {
        const schoolConfig = schoolResult.school;
        const studentPayments = feePaymentsResult.success && feePaymentsResult.payments ? feePaymentsResult.payments : [];
        
        if (authUser.classId) {
            const totalFee = calculateTotalFee(authUser.classId as string, schoolConfig);
            const totalPaid = studentPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
            const totalDue = totalFee - totalPaid;
            const percentagePaid = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;
            setFeeSummary({ totalFee, totalPaid, totalDue, percentagePaid });
        } else {
            // Student not assigned to a class, can't calculate fees.
            setFeeSummary({ totalFee: 0, totalPaid: 0, totalDue: 0, percentagePaid: 0 });
             toast({ variant: "info", title: "Fee Info", description: "You are not assigned to a class, so fee details cannot be calculated." });
        }
      } else {
        toast({ variant: "destructive", title: "School Info Error", description: schoolResult.message || "Could not load school details for fee calculation." });
        setFeeSummary(null);
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Dashboard Error", description: "An unexpected error occurred fetching dashboard data." });
      setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      setFeeSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast, calculateTotalFee]);
  
  useEffect(() => {
    if (authUser?._id && authUser?.schoolId) {
      fetchAllStudentData();
    } else if (!authUser && !localStorage.getItem('loggedInUser')){ 
      setIsLoading(false);
    }
  }, [authUser, fetchAllStudentData]);


  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in as a student to view your dashboard.</p>
           <Button asChild className="mt-4"><Link href="/">Go to Login</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Student Dashboard</CardTitle>
          <CardDescription>
            Welcome, {authUser.name}! 
            {authUser.classId && ` (Class: ${authUser.classId})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Here's an overview of your academic information.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Fee Status</CardTitle>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {feeSummary ? (
              <>
                <div className="text-3xl font-bold">${feeSummary.totalDue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Due out of ${feeSummary.totalFee.toLocaleString()}</p>
                <Progress value={feeSummary.percentagePaid} className="mt-2 h-3" />
                <div className="mt-2 flex justify-between text-sm">
                  <span>Paid: ${feeSummary.totalPaid.toLocaleString()}</span>
                  <span className={`font-semibold ${feeSummary.totalDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {feeSummary.totalDue > 0 ? "Partially Paid" : "Fully Paid"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Fee details are loading or unavailable.</p>
            )}
             <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/dashboard/student/fees">View Full Fee Details <ListChecks className="ml-1 h-4 w-4"/> </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Attendance Overview</CardTitle>
            <CheckSquare className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {attendanceSummary.total > 0 ? (
              <>
                <div className="text-3xl font-bold">{attendanceSummary.percentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceSummary.present + attendanceSummary.late} present out of {attendanceSummary.total} days
                </p>
                <Progress value={attendanceSummary.percentage} className="mt-2 h-3" />
                <div className="mt-2 flex justify-between text-sm">
                  <span>Present: {attendanceSummary.present}</span>
                  <span>Late: {attendanceSummary.late}</span>
                  <span>Absent: {attendanceSummary.absent}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No attendance records found yet.</p>
            )}
             <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/dashboard/student/attendance">View Full Attendance Log <CalendarClock className="ml-1 h-4 w-4"/> </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/student/courses"><BookOpen className="mr-2 h-5 w-5"/> My Courses</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/student/profile"><UserCircle className="mr-2 h-5 w-5"/> My Profile</Link>
            </Button>
             <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/student/results"><Percent className="mr-2 h-5 w-5"/> Exam Results</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
