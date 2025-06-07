import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckSquare, BookOpen, MessageSquare, CalendarDays, User } from "lucide-react";

export default function TeacherDashboardPage() {
  // Placeholder for teacher's name and assigned class, would come from context or props
  const teacherName = "Mrs. Davis";
  const assignedClass = "Grade 10A";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Teacher Dashboard</CardTitle>
          <CardDescription>Welcome, {teacherName}. Manage attendance and view information for your class: {assignedClass}.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Use the sections below to manage your daily tasks and access class resources.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CheckSquare className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Record daily student attendance for {assignedClass}.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/teacher/attendance">Go to Attendance</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <BookOpen className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Class Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>View your daily and weekly teaching schedule.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/teacher/schedule">View Schedule</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <MessageSquare className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Communication</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Send messages to students, parents, or administration.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/teacher/messages">Open Messages</Link>
            </Button>
          </CardContent>
        </Card>

         <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CalendarDays className="h-10 w-10 text-primary mb-2" />
                <CardTitle>My Timetable</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Access your personalized teaching timetable and upcoming events.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/teacher/timetable">View Timetable</Link>
                </Button>
            </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <User className="h-10 w-10 text-primary mb-2" />
                <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>View and update your personal and professional details.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/teacher/profile">View Profile</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
