
"use client";

import Link from "next/link";
import { School, UserCircle, LogOut, Menu, Settings, Users, DollarSign, CheckSquare, LayoutDashboard, BookUser, ShieldAlert, User as UserIcon } from "lucide-react"; // Renamed User to UserIcon
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/types/user"; // Import central AuthUser

const navLinksBase = {
  superadmin: [
    { href: "/dashboard/super-admin", label: "SA Dashboard", icon: ShieldAlert },
    { href: "/dashboard/super-admin/schools", label: "Schools", icon: School },
    { href: "/dashboard/super-admin/users", label: "School Admins", icon: Users },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Admin Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/fees", label: "Fees", icon: DollarSign },
    { href: "/dashboard/admin/attendance", label: "Attendance", icon: CheckSquare },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Teacher Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/teacher/attendance", label: "Mark Attendance", icon: CheckSquare },
    { href: "/dashboard/teacher/profile", label: "My Profile", icon: UserIcon },
  ],
  student: [
    { href: "/dashboard/student", label: "Student Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/student/fees", label: "My Fees", icon: DollarSign },
    { href: "/dashboard/student/attendance", label: "My Attendance", icon: CheckSquare },
    { href: "/dashboard/student/profile", label: "My Profile", icon: BookUser },
  ],
};

type Role = keyof typeof navLinksBase;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);


  useEffect(() => {
    setIsLoadingUser(true);
    const storedUser = localStorage.getItem('loggedInUser');
    
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser); // Use updated AuthUser
        if (parsedUser && parsedUser.role) { 
          setAuthUser(parsedUser);
        } else {
          localStorage.removeItem('loggedInUser');
          setAuthUser(null);
          toast({
            variant: "destructive",
            title: "Session Error",
            description: "Invalid session data. Please log in again.",
          });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage in Header:", e);
        localStorage.removeItem('loggedInUser');
        setAuthUser(null);
        toast({
          variant: "destructive",
          title: "Session Error",
          description: "Your session data might be corrupted. Please log in again.",
        });
      } finally {
        setIsLoadingUser(false);
      }
    } else {
      if (storedUser) { 
        localStorage.removeItem('loggedInUser');
      }
      if (authUser !== null) { 
        setAuthUser(null);
      }
      setIsLoadingUser(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, toast]); // authUser removed from deps to prevent re-renders, pathname covers route changes


  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setAuthUser(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push("/");
    setIsSheetOpen(false); // Close sheet on logout
  };

  const currentRole = authUser?.role as Role | undefined;
  const currentNavLinks = currentRole ? navLinksBase[currentRole] || [] : [];

  if (isLoadingUser) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
            <School className="h-7 w-7 text-primary" />
            <span className="font-headline">CampusFlow</span>
          </Link>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold sm:text-xl" onClick={() => setIsSheetOpen(false)}>
          <School className="h-7 w-7 text-primary" />
          <span className="font-headline">CampusFlow</span>
        </Link>

        {authUser && (
          <>
            <nav className="hidden md:flex gap-4 items-center">
              {currentNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === link.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 md:gap-4"> {/* Adjusted gap for mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserCircle className="h-6 w-6" />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{authUser.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {authUser.email} ({authUser.role && authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)})
                         {authUser.classId && authUser.role === 'student' && ` - ${authUser.classId}`}
                         {authUser.classId && authUser.role === 'teacher' && ` - Class: ${authUser.classId}`}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {router.push('/dashboard/profile'); setIsSheetOpen(false);}}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {router.push('/dashboard/settings'); setIsSheetOpen(false);}}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="pt-10">
                  <nav className="grid gap-4 text-base font-medium">
                    <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4" onClick={() => setIsSheetOpen(false)}>
                      <School className="h-7 w-7 text-primary" />
                      <span className="font-headline">CampusFlow</span>
                    </Link>
                    {currentNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsSheetOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                          pathname === link.href ? "text-primary bg-muted" : "text-muted-foreground"
                        }`}
                      >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
        {!authUser && !isLoadingUser && (
            <Button asChild onClick={() => setIsSheetOpen(false)}>
                <Link href="/">Login</Link>
            </Button>
        )}
      </div>
    </header>
  );
}
