
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, CheckSquare, Percent, BookOpen, UserCircle, Loader2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getStudentAttendanceRecords } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  percentage: number;
  total: number;
}

export default function StudentDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    present: 0, absent: 0, late: 0, percentage: 0, total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Mock fee data (can be made dynamic later)
  const mockFees = {
    total: 5000,
    paid: 3000,
    due: 2000,
    status: "Partially Paid",
  };

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

  const fetchAttendanceData = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoading(false);
      setAttendanceRecords([]);
      return;
    }

    setIsLoading(true);
    const result = await getStudentAttendanceRecords(authUser._id.toString(), authUser.schoolId.toString());
    
    if (result.success && result.records) {
      setAttendanceRecords(result.records);
      calculateSummary(result.records);
    } else {
      toast({ variant: "destructive", title: "Failed to Load Attendance", description: result.error || "Could not fetch attendance data." });
      setAttendanceRecords([]);
      calculateSummary([]); // Reset summary
    }
    setIsLoading(false);
  }, [authUser, toast]);

  const calculateSummary = (records: AttendanceRecord[]) => {
    const totalDays = records.length;
    if (totalDays === 0) {
      setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      return;
    }
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const attendedDays = present + late;
    const percentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;
    setAttendanceSummary({ present, absent, late, percentage, total: totalDays });
  };
  
  useEffect(() => {
    if (authUser?._id && authUser?.schoolId) {
      fetchAttendanceData();
    } else if (!authUser && !localStorage.getItem('loggedInUser')){ // Only set loading false if we are sure user is not logged in
      setIsLoading(false);
    }
    // If authUser is null but localStorage might still have a user, isLoading remains true
    // until the first useEffect (for authUser) sets authUser or clears it.
  }, [authUser, fetchAttendanceData]);


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
            {authUser.classId && ` (${authUser.classId})`}
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
            <div className="text-3xl font-bold">${mockFees.due.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Due out of ${mockFees.total.toLocaleString()}</p>
            <Progress value={(mockFees.paid / mockFees.total) * 100} className="mt-2 h-3" />
            <div className="mt-2 flex justify-between text-sm">
              <span>Paid: ${mockFees.paid.toLocaleString()}</span>
              <span className={`font-semibold ${mockFees.due > 0 ? 'text-destructive' : 'text-green-600'}`}>{mockFees.status}</span>
            </div>
             <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/dashboard/student/fees">View Fee Details <Percent className="ml-1 h-4 w-4"/> </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Attendance Overview</CardTitle>
            <CheckSquare className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {attendanceRecords.length > 0 ? (
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
