
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckSquare, BookOpen, MessageSquare, CalendarDays, User, Loader2, Info } from "lucide-react";
import { useState, useEffect } from "react";
import type { AuthUser } from "@/types/user"; // Assuming AuthUser type includes name and classId
import { useToast } from "@/hooks/use-toast";

export default function TeacherDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'teacher') {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          // Optional: Redirect or show access denied if not a teacher
          // toast({ variant: "destructive", title: "Access Denied", description: "Not authorized."});
        }
      } catch(e) {
        console.error("TeacherDashboard: Failed to parse user from localStorage", e);
        setAuthUser(null);
        toast({ variant: "destructive", title: "Session Error", description: "Could not load user data."});
      }
    } else {
      setAuthUser(null);
    }
    setIsLoading(false);
  }, [toast]);

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
          <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-destructive"/>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in as a teacher to view this page.</p>
           <Button asChild className="mt-4"><Link href="/">Go to Login</Link></Button>
        </CardContent>
      </Card>
    );
  }
  
  const teacherName = authUser.name || "Teacher";
  const assignedClass = authUser.classId || "your assigned class";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Teacher Dashboard</CardTitle>
          <CardDescription>Welcome, {teacherName}. Manage attendance and view information for {assignedClass}.</CardDescription>
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
            <Button asChild className="mt-4" disabled={!authUser.classId}>
              <Link href="/dashboard/teacher/attendance">Go to Attendance</Link>
            </Button>
            {!authUser.classId && <p className="text-xs text-destructive mt-1">Class not assigned.</p>}
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
