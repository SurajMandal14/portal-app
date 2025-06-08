
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Save, Loader2, School as SchoolIcon, Briefcase } from "lucide-react"; // Added SchoolIcon, Briefcase
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import type { AuthUser } from "@/types/user";
import type { School } from "@/types/school";
import { getSchoolById } from "@/app/actions/schools";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional(), // Email is non-editable
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function TeacherProfilePage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const fetchSchoolDetails = useCallback(async (schoolId: string) => {
    const result = await getSchoolById(schoolId);
    if (result.success && result.school) {
      setSchoolDetails(result.school);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not load school details." });
    }
  }, [toast]);

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'teacher') {
          setAuthUser(parsedUser);
          form.reset({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            phone: (parsedUser as any).phone || "", 
          });
          if (parsedUser.schoolId) {
            fetchSchoolDetails(parsedUser.schoolId.toString());
          }
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "Invalid user role for this page." });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        setAuthUser(null);
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    } else {
      setAuthUser(null);
    }
    setIsLoading(false);
  }, [form, toast, fetchSchoolDetails]);

  function onSubmit(values: ProfileFormData) {
    console.log("Updating teacher profile with (simulated):", values);
    toast({
      title: "Profile Update (Simulated)",
      description: "Your profile information has been logged. Backend update not yet implemented.",
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in as a teacher to view this page.</p>
           <Button asChild className="mt-4" onClick={() => window.location.href = '/'}>Go to Login</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <UserCircle className="mr-2 h-6 w-6" /> Teacher Profile
          </CardTitle>
          <CardDescription>View and update your personal information.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={"https://placehold.co/128x128.png"} alt={authUser.name} data-ai-hint="profile avatar" />
              <AvatarFallback>{authUser.name ? authUser.name.substring(0, 2).toUpperCase() : "T"}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{authUser.name}</CardTitle>
              <p className="text-muted-foreground">{authUser.email}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Role: {authUser.role}
              </p>
              {schoolDetails && (
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  <SchoolIcon className="mr-1 h-4 w-4" /> {schoolDetails.schoolName}
                </p>
              )}
              {authUser.classId && (
                <p className="text-sm text-muted-foreground flex items-center">
                  <Briefcase className="mr-1 h-4 w-4" /> Class Assigned: {authUser.classId}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
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
                      <Input placeholder="your.email@example.com" {...field} disabled />
                    </FormControl>
                    <FormDescription>Email address cannot be changed through this form.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> Save Changes (Simulated)
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
