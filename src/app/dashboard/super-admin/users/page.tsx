
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, Building } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createSchoolAdmin, getSchoolAdmins } from "@/app/actions/adminUsers";
import { getSchools } from "@/app/actions/schools";
import type { SchoolAdminFormData, User } from "@/types/user";
import type { School } from "@/types/school";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';

// Zod schema for the form
const schoolAdminFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  schoolId: z.string().min(1, { message: "School selection is required." }),
});

type SchoolAdmin = Partial<User> & { schoolName?: string };

export default function SuperAdminUserManagementPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schoolAdminFormSchema>>({
    resolver: zodResolver(schoolAdminFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      schoolId: "",
    },
  });

  const fetchAdminsAndSchools = useCallback(async () => {
    setIsLoadingAdmins(true);
    setIsLoadingSchools(true);
    
    const [adminsResult, schoolsResult] = await Promise.all([
      getSchoolAdmins(),
      getSchools()
    ]);

    if (adminsResult.success && adminsResult.admins) {
      setAdmins(adminsResult.admins);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to load admins",
        description: adminsResult.error || "Could not fetch admin data.",
      });
    }
    setIsLoadingAdmins(false);

    if (schoolsResult.success && schoolsResult.schools) {
      setSchools(schoolsResult.schools);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to load schools",
        description: schoolsResult.error || "Could not fetch school list for dropdown.",
      });
    }
    setIsLoadingSchools(false);
  }, [toast]);

  useEffect(() => {
    fetchAdminsAndSchools();
  }, [fetchAdminsAndSchools]);

  async function onSubmit(values: z.infer<typeof schoolAdminFormSchema>) {
    setIsSubmitting(true);
    const result = await createSchoolAdmin(values);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "School Admin Created",
        description: result.message,
      });
      form.reset(); // Reset form fields
      fetchAdminsAndSchools(); // Refresh admin list
    } else {
      toast({
        variant: "destructive",
        title: "Error Creating Admin",
        description: result.error || result.message,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> School Administrator Management
          </CardTitle>
          <CardDescription>Create and manage administrator accounts for each school.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New School Administrator</CardTitle>
        </CardHeader>
        <CardContent>
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
                        <Input placeholder="e.g., Jane Doe" {...field} disabled={isSubmitting} />
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
                        <Input type="email" placeholder="admin@schoolname.com" {...field} disabled={isSubmitting} />
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
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" />Assign to School</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || isLoadingSchools}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingSchools ? "Loading schools..." : "Select a school"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school._id} value={school._id.toString()}>
                              {school.schoolName}
                            </SelectItem>
                          ))}
                           {schools.length === 0 && !isLoadingSchools && <SelectItem value="no-school" disabled>No schools available</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoadingSchools}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating Admin..." : "Create School Admin"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Existing School Administrators</CardTitle>
            {/* <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search admins..." className="w-full sm:max-w-xs" />
              <Button variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAdmins ? (
             <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading administrators...</p>
            </div>
          ) : admins.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>School Assigned</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin._id?.toString()}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.schoolName || (admin.schoolId ? "School ID: "+admin.schoolId.toString().substring(0,8)+"..." : 'N/A')}
                  </TableCell>
                  <TableCell>{admin.createdAt ? format(new Date(admin.createdAt), "PPpp") : 'N/A'}</TableCell>
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
             <p className="text-center text-muted-foreground py-4">No school administrators found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
