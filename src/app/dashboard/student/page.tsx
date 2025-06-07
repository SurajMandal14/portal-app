import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, CheckSquare, Percent, BookOpen, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock data for a student
const mockStudentData = {
  name: "Alice Smith",
  class: "Grade 10A",
  rollNumber: "S001",
  fees: {
    total: 5000,
    paid: 3000,
    due: 2000,
    status: "Partially Paid",
  },
  attendance: {
    totalDays: 120,
    presentDays: 110,
    absentDays: 10,
    percentage: 0, // Will be calculated
  },
};
mockStudentData.attendance.percentage = Math.round((mockStudentData.attendance.presentDays / mockStudentData.attendance.totalDays) * 100);


export default function StudentDashboardPage() {
  const { name, class: studentClass, rollNumber, fees, attendance } = mockStudentData;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Student Dashboard</CardTitle>
          <CardDescription>Welcome, {name}! ({studentClass} - Roll No: {rollNumber})</CardDescription>
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
            <div className="text-3xl font-bold">${fees.due.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Due out of ${fees.total.toLocaleString()}</p>
            <Progress value={(fees.paid / fees.total) * 100} className="mt-2 h-3" />
            <div className="mt-2 flex justify-between text-sm">
              <span>Paid: ${fees.paid.toLocaleString()}</span>
              <span className={`font-semibold ${fees.due > 0 ? 'text-destructive' : 'text-green-600'}`}>{fees.status}</span>
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
            <div className="text-3xl font-bold">{attendance.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {attendance.presentDays} present out of {attendance.totalDays} days
            </p>
            <Progress value={attendance.percentage} className="mt-2 h-3" />
            <div className="mt-2 flex justify-between text-sm">
              <span>Present: {attendance.presentDays}</span>
              <span>Absent: {attendance.absentDays}</span>
            </div>
             <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/dashboard/student/attendance">View Attendance Log <Percent className="ml-1 h-4 w-4"/> </Link>
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
