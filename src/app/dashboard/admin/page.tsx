
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, DollarSign, CheckSquare, BarChart2, Settings, Briefcase, BookOpen, Percent, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { AuthUser } from "@/types/user";
import type { School } from "@/types/school";
import type { DailyAttendanceOverview } from "@/types/attendance";
import { getSchoolUserRoleCounts, type SchoolUserRoleCounts } from "@/app/actions/schoolUsers";
import { getDailyAttendanceOverviewForSchool } from "@/app/actions/attendance";
import { getSchoolById } from "@/app/actions/schools";
import { useToast } from "@/hooks/use-toast";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
  link?: string;
  linkText?: string;
}

function StatCard({ title, value, icon: Icon, isLoading, description, link, linkText }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
        {link && linkText && !isLoading && (
          <Link href={link} className="text-xs text-primary hover:underline mt-1 block">
            {linkText}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [userCounts, setUserCounts] = useState<SchoolUserRoleCounts | null>(null);
  const [attendanceOverview, setAttendanceOverview] = useState<DailyAttendanceOverview | null>(null);
  
  const [isLoadingSchoolName, setIsLoadingSchoolName] = useState(true);
  const [isLoadingUserCounts, setIsLoadingUserCounts] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
           toast({ variant: "destructive", title: "Access Denied", description: "Not authorized for admin dashboard."});
        }
      } catch(e) {
        setAuthUser(null);
         toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data."});
      }
    } else {
        setAuthUser(null);
    }
  }, [toast]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!authUser || !authUser.schoolId) {
        setIsLoadingSchoolName(false);
        setIsLoadingUserCounts(false);
        setIsLoadingAttendance(false);
        return;
      }

      setIsLoadingSchoolName(true);
      setIsLoadingUserCounts(true);
      setIsLoadingAttendance(true);

      // Fetch School Name
      getSchoolById(authUser.schoolId.toString()).then(result => {
        if (result.success && result.school) {
          setSchoolDetails(result.school);
        } else {
          toast({ variant: "warning", title: "School Info", description: "Could not load school name."});
        }
        setIsLoadingSchoolName(false);
      });

      // Fetch User Counts
      getSchoolUserRoleCounts(authUser.schoolId.toString()).then(result => {
        if (result.success && result.counts) {
          setUserCounts(result.counts);
        } else {
          toast({ variant: "warning", title: "User Stats", description: result.message || "Could not load user counts."});
        }
        setIsLoadingUserCounts(false);
      });
      
      // Fetch Attendance Overview for Today
      getDailyAttendanceOverviewForSchool(authUser.schoolId.toString(), new Date()).then(result => {
        if (result.success && result.summary) {
          setAttendanceOverview(result.summary);
        } else {
          toast({ variant: "warning", title: "Attendance Stats", description: result.message || "Could not load today's attendance overview."});
           setAttendanceOverview({ totalStudents: userCounts?.students || 0, present: 0, absent: userCounts?.students || 0, late: 0, percentage: 0 });
        }
        setIsLoadingAttendance(false);
      });
    }

    if (authUser && authUser.schoolId) {
      fetchDashboardData();
    } else {
      // If no authUser or schoolId, set loading states to false.
      setIsLoadingSchoolName(false);
      setIsLoadingUserCounts(false);
      setIsLoadingAttendance(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, toast]); // userCounts?.students is removed, as it creates a loop if attendance sets itself based on it on failure

  const schoolName = schoolDetails?.schoolName || (isLoadingSchoolName ? "Loading..." : "Your School");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Admin Dashboard - {schoolName}</CardTitle>
          <CardDescription>Manage student information, fees, attendance, and staff for your school.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Welcome, Administrator of {schoolName}. Use the sections below to manage your school's operations.</p>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
            title="Total Students"
            value={userCounts?.students ?? 'N/A'}
            icon={BookOpen}
            isLoading={isLoadingUserCounts}
            link="/dashboard/admin/users"
            linkText="Manage Students"
        />
        <StatCard 
            title="Total Teachers"
            value={userCounts?.teachers ?? 'N/A'}
            icon={Briefcase}
            isLoading={isLoadingUserCounts}
            link="/dashboard/admin/users"
            linkText="Manage Teachers"
        />
        <StatCard 
            title="Today's Attendance"
            value={`${attendanceOverview?.percentage ?? 'N/A'}%`}
            icon={Percent}
            isLoading={isLoadingAttendance}
            description={attendanceOverview ? `${attendanceOverview.present + attendanceOverview.late} / ${attendanceOverview.totalStudents} attended` : "Loading data..."}
            link="/dashboard/admin/attendance"
            linkText="View Details"
        />
      </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Users className="h-10 w-10 text-primary mb-2" />
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Add, edit, and manage student, teacher, and other staff accounts.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <DollarSign className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Fee Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Track student fee payments, generate receipts, and manage fee structures.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/fees">Manage Fees</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CheckSquare className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>View and monitor student attendance records submitted by teachers.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/attendance">View Attendance</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <BarChart2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>School Reports</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Generate reports on student performance, fees, and attendance.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/admin/reports">View Reports</Link>
                </Button>
            </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <Settings className="h-10 w-10 text-primary mb-2" />
                <CardTitle>School Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Configure academic years, terms, and other school-specific settings.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/admin/settings">School Settings</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
