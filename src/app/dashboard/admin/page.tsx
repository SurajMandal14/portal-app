import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, DollarSign, CheckSquare, BarChart2, Settings } from "lucide-react";

export default function AdminDashboardPage() {
  // Placeholder for school name, would come from context or props
  const schoolName = "Greenwood High"; 

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
