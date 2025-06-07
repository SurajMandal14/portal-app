"use client";

import Link from "next/link";
import { School, UserCircle, LogOut, Menu, Settings, Users, DollarSign, CheckSquare } from "lucide-react";
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
import { usePathname, useRouter } from "next/navigation"; // useRouter for logout
import { useToast } from "@/hooks/use-toast"; // for logout toast

// Mock user data - replace with actual auth context later
const user = {
  name: "Super Admin", // This would be dynamic
  role: "superadmin", // This would be dynamic: 'superadmin', 'admin', 'teacher', 'student'
};

const navLinks = {
  superadmin: [
    { href: "/dashboard/super-admin", label: "Dashboard", icon: Settings },
    { href: "/dashboard/super-admin/schools", label: "Schools", icon: School },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Dashboard", icon: Settings },
    { href: "/dashboard/admin/fees", label: "Fees", icon: DollarSign },
    { href: "/dashboard/admin/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/dashboard/admin/users", label: "Manage Users", icon: Users },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Dashboard", icon: Settings },
    { href: "/dashboard/teacher/attendance", label: "Mark Attendance", icon: CheckSquare },
  ],
  student: [
    { href: "/dashboard/student", label: "My Dashboard", icon: Settings },
    { href: "/dashboard/student/fees", label: "My Fees", icon: DollarSign },
    { href: "/dashboard/student/attendance", label: "My Attendance", icon: CheckSquare },
  ],
};

type Role = keyof typeof navLinks;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Determine current role's navigation links
  const currentNavLinks = navLinks[user.role as Role] || [];

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    setTimeout(() => {
      router.push("/"); // Redirect to login page
    }, 1000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          <School className="h-7 w-7 text-primary" />
          <span className="font-headline">CampusFlow</span>
        </Link>

        {/* Desktop Navigation */}
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

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-6 w-6" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name} ({user.role})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium mt-8">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <School className="h-7 w-7 text-primary" />
                  <span className="font-headline">CampusFlow</span>
                </Link>
                {currentNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
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
      </div>
    </header>
  );
}
