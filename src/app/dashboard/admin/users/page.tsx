
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Not directly used, FormLabel is used
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, BookUser, Briefcase } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createSchoolUser, getSchoolUsers } from "@/app/actions/schoolUsers";
import { createSchoolUserFormSchema, type CreateSchoolUserFormData } from '@/types/user'; // Import from types
import { getSchoolById } from "@/app/actions/schools";
import type { User as AppUser, UserRole } from "@/types/user";
import type { School, ClassFeeConfig } from "@/types/school";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance"; // Using AuthUser for loggedInUser

type SchoolUser = Partial<AppUser> & { className?: string };

export default function AdminUserManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<CreateSchoolUserFormData>({
    resolver: zodResolver(createSchoolUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: undefined, // User must select a role
      classId: "", 
    },
  });
  const selectedRole = form.watch("role");

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin to access this page." });
        }
      } catch (e) {
        console.error("Failed to parse authUser in AdminUserManagementPage:", e);
        setAuthUser(null);
      }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const fetchInitialData = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [schoolResult, usersResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString())
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
      }

      if (usersResult.success && usersResult.users) {
        // Map className to users
        // Assuming user.classId stores the className string directly
        const usersWithClassNames = usersResult.users.map(user => {
          return { ...user, className: user.classId || 'N/A' };
        });
        setSchoolUsers(usersWithClassNames);
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load school users." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred while fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser && authUser.schoolId) {
      fetchInitialData();
    } else {
      setSchoolUsers([]);
      setSchoolDetails(null);
      setIsLoadingData(false);
    }
  }, [authUser, fetchInitialData]);

  async function onSubmit(values: CreateSchoolUserFormData) {
    if (!authUser || !authUser.schoolId) {
      toast({ variant: "destructive", title: "Error", description: "Admin authentication error." });
      return;
    }
    setIsSubmitting(true);
    // The `classId` from the form is the className string, which is what `createSchoolUser` expects
    const result = await createSchoolUser(values, authUser.schoolId.toString());
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "User Created", description: result.message });
      form.reset();
      fetchInitialData(); // Refresh user list
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  const filteredUsers = schoolUsers.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user as any).className?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (!authUser && !isLoadingData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need to be logged in as a school administrator to manage users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const availableClasses = schoolDetails?.classFees.map(cf => cf.className) || [];


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> School User Management
          </CardTitle>
          <CardDescription>
            Manage teacher and student accounts for {schoolDetails?.schoolName || "your school"}.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5"/>Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingData && !schoolDetails ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading school configuration...</p>
            </div>
          ) : !schoolDetails && !isLoadingData? (
             <p className="text-center text-muted-foreground py-4">School details not found. Cannot add users.</p>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Teacher" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="teacher"><Briefcase className="mr-2 h-4 w-4 inline-block"/> Teacher</SelectItem>
                            <SelectItem value="student"><BookUser className="mr-2 h-4 w-4 inline-block"/> Student</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 {(selectedRole === 'teacher' || selectedRole === 'student') && availableClasses.length > 0 && (
                    <FormField
                        control={form.control}
                        name="classId" // This field will store the className string
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assign to Class (Optional for Teacher, Recommended for Student)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {availableClasses.map((className) => (
                                <SelectItem key={className} value={className}>
                                    {className}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}
                 {selectedRole && availableClasses.length === 0 && (
                    <p className="text-sm text-muted-foreground md:col-span-2">No classes configured for this school. Please add classes in School Settings or Super Admin panel to assign users to a class.</p>
                 )}

              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoadingData}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Creating User..." : "Create User"}
              </Button>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>User List ({schoolDetails?.schoolName || "Your School"})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input 
                placeholder="Search users..." 
                className="w-full sm:max-w-xs" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingData || !schoolUsers.length}
              />
              <Button variant="outline" size="icon" disabled={isLoadingData || !schoolUsers.length}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Class Assigned</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id?.toString()}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'student' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.className || 'N/A'}</TableCell>
                  <TableCell>{user.createdAt ? format(new Date(user.createdAt), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled> {/* TODO: Implement Edit */}
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" disabled> {/* TODO: Implement Delete */}
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No users match your search." : "No teachers or students found for this school."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

