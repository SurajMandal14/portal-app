import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, UserCog, ShieldAlert, BookUser, User, DollarSign, CheckSquare, Users } from "lucide-react";

// Mock user role for demonstration
const userRole = "superadmin"; // Change this to 'admin', 'teacher', 'student' to see different views

const roleSpecificLinks = {
  superadmin: [
    { href: "/dashboard/super-admin/schools", title: "Manage Schools", description: "Create and configure schools.", icon: UserCog },
    { href: "/dashboard/super-admin", title: "Super Admin Panel", description: "Oversee all operations.", icon: ShieldAlert },
  ],
  admin: [
    { href: "/dashboard/admin/fees", title: "Manage Fees", description: "Handle student fee payments.", icon: DollarSign },
    { href: "/dashboard/admin/attendance", title: "View Attendance", description: "Monitor student attendance records.", icon: CheckSquare },
    { href: "/dashboard/admin/users", title: "Manage Users", description: "Add and manage admins, teachers, students.", icon: Users },
  ],
  teacher: [
    { href: "/dashboard/teacher/attendance", title: "Mark Attendance", description: "Record daily student attendance.", icon: CheckSquare },
    { href: "/dashboard/teacher/profile", title: "My Profile", description: "View and update your details.", icon: User },
  ],
  student: [
    { href: "/dashboard/student/fees", title: "My Fees", description: "Check your fee status and history.", icon: DollarSign },
    { href: "/dashboard/student/attendance", title: "My Attendance", description: "View your attendance record.", icon: CheckSquare },
    { href: "/dashboard/student/profile", title: "My Profile", description: "View your academic information.", icon: BookUser },
  ],
}

export default function DashboardPage() {
  const links = roleSpecificLinks[userRole as keyof typeof roleSpecificLinks] || [];
  
  return (
    <div className="container mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Welcome to CampusFlow!</CardTitle>
          <CardDescription>Your central hub for campus management. Select an option below to get started.</CardDescription>
        </CardHeader>
        <CardContent>
           <p>You are logged in as: <span className="font-semibold capitalize">{userRole}</span></p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.href} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{link.title}</CardTitle>
              <link.icon className="w-6 h-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{link.description}</p>
              <Button asChild variant="outline" size="sm">
                <Link href={link.href}>
                  Go to {link.title} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
         {links.length === 0 && <p>No specific actions available for your role currently, or role not recognized.</p>}
      </div>
    </div>
  );
}
