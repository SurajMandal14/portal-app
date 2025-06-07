
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, UserCog, ShieldAlert, BookUser, User, DollarSign, CheckSquare, Users, LayoutDashboard, Home, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User as AppUser } from "@/types/user";

type AuthUser = Pick<AppUser, 'email' | 'name' | 'role' | '_id' | 'schoolId'>;

const roleSpecificLinks = {
  superadmin: [
    { href: "/dashboard/super-admin", title: "Super Admin Panel", description: "Oversee all operations.", icon: ShieldAlert },
    { href: "/dashboard/super-admin/schools", title: "Manage Schools", description: "Create and configure schools.", icon: UserCog },
    { href: "/dashboard/super-admin/users", title: "Manage School Admins", description: "Manage school administrator accounts.", icon: Users },
  ],
  admin: [
    { href: "/dashboard/admin", title: "Admin Dashboard", description: "Manage your school's operations.", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", title: "Manage School Users", description: "Add and manage teachers, students.", icon: Users },
    { href: "/dashboard/admin/fees", title: "Manage Fees", description: "Handle student fee payments.", icon: DollarSign },
    { href: "/dashboard/admin/attendance", title: "View Attendance", description: "Monitor student attendance records.", icon: CheckSquare },
  ],
  teacher: [
    { href: "/dashboard/teacher", title: "Teacher Dashboard", description: "Access your teaching tools.", icon: LayoutDashboard },
    { href: "/dashboard/teacher/attendance", title: "Mark Attendance", description: "Record daily student attendance.", icon: CheckSquare },
    { href: "/dashboard/teacher/profile", title: "My Profile", description: "View and update your details.", icon: User },
  ],
  student: [
    { href: "/dashboard/student", title: "Student Dashboard", description: "Access your academic information.", icon: LayoutDashboard },
    { href: "/dashboard/student/fees", title: "My Fees", description: "Check your fee status and history.", icon: DollarSign },
    { href: "/dashboard/student/attendance", title: "My Attendance", description: "View your attendance record.", icon: CheckSquare },
    { href: "/dashboard/student/profile", title: "My Profile", description: "View your academic information.", icon: BookUser },
  ],
};

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true); // Ensure loading is true at the start of the effect
    const storedUser = localStorage.getItem('loggedInUser');

    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role) { // Check for a valid user object
          setAuthUser(parsedUser);
          if (pathname === '/dashboard') {
            if (parsedUser.role === 'superadmin') router.replace("/dashboard/super-admin");
            else if (parsedUser.role === 'admin') router.replace("/dashboard/admin");
            else if (parsedUser.role === 'teacher') router.replace("/dashboard/teacher");
            else if (parsedUser.role === 'student') router.replace("/dashboard/student");
            // If role is unknown but user is on /dashboard, they will see the generic dashboard content below
          }
        } else {
          // Parsed object is not a valid user
          localStorage.removeItem('loggedInUser');
          setAuthUser(null);
          router.replace('/');
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage in DashboardPage:", e);
        localStorage.removeItem('loggedInUser');
        setAuthUser(null);
        router.replace('/'); 
      } finally {
        setIsLoading(false);
      }
    } else {
      // No valid user string in localStorage
      if (storedUser) { // If it was an invalid string like "undefined" or "null"
         localStorage.removeItem('loggedInUser');
      }
      setAuthUser(null); // Ensure authUser state is null
      router.replace('/'); 
      setIsLoading(false);
    }
  }, [router, pathname]);

  if (isLoading || (!authUser && pathname === '/dashboard')) { // Show loader if loading, or if on /dashboard and authUser isn't set yet (before redirect)
    return (
      <div className="flex flex-1 items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // This part will render if on /dashboard and user is authenticated but role redirect hasn't happened or is not applicable
  // Or if a user somehow lands here with a role not in the redirect list.
  if (!authUser) { 
    // This case should ideally be covered by the loader and redirect,
    // but as a fallback if navigation directly to /dashboard happens and authUser is still null post-loading.
    // It should be rare if redirects work correctly.
    return (
         <div className="flex flex-1 items-center justify-center h-screen">
            <p>Redirecting...</p> {/* Or a more specific message */}
            <Loader2 className="h-16 w-16 animate-spin text-primary ml-4" />
        </div>
    );
  }


  const links = roleSpecificLinks[authUser.role as keyof typeof roleSpecificLinks] || [];
  
  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Home className="mr-3 h-8 w-8 text-primary" /> Welcome to CampusFlow, {authUser.name}!
          </CardTitle>
          <CardDescription className="text-lg">Your central hub for campus management. You are logged in as a <span className="font-semibold capitalize">{authUser.role}</span>.</CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground">Select an option below to navigate to your dashboard or manage specific areas. If you're not automatically redirected to your specific dashboard, please use the navigation menu.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.href} className="hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-semibold">{link.title}</CardTitle>
              <link.icon className="w-8 h-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-base text-muted-foreground mb-4">{link.description}</p>
              <Button asChild variant="default" size="sm" className="w-full">
                <Link href={link.href}>
                  Go to {link.title} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
         {links.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground text-lg">No specific quick actions available for your role on this page, or your role is not fully configured for this view. Please use the navigation menu or ensure you are on your role-specific dashboard page.</p>
                </CardContent>
            </Card>
         )}
      </div>
    </div>
  );
}
