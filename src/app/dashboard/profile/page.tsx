
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/types/attendance"; // Using AuthUser for loggedInUser type

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional(), // Email is non-editable for now
  phone: z.string().optional(),
  // Password fields would be added here if password change is implemented
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role) {
          setAuthUser(parsedUser);
          form.reset({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            phone: (parsedUser as any).phone || "", // Assuming phone might exist on user object
          });
        } else {
          setAuthUser(null);
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
  }, [form, toast]);

  function onSubmit(values: ProfileFormData) {
    // TODO: Implement actual profile update logic with a server action
    console.log("Updating profile with:", values);
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
          <p>Please log in to view your profile.</p>
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
            <UserCircle className="mr-2 h-6 w-6" /> User Profile
          </CardTitle>
          <CardDescription>View and update your personal information.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={"https://placehold.co/128x128.png"} alt={authUser.name} data-ai-hint="profile avatar" />
              <AvatarFallback>{authUser.name ? authUser.name.substring(0, 2).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{authUser.name}</CardTitle>
              <p className="text-muted-foreground">{authUser.email}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Role: {authUser.role}
                {authUser.schoolId && ` (School ID: ${authUser.schoolId.toString().substring(0,8)}...)`}
                {authUser.classId && ` (Class: ${authUser.classId})`}
              </p>
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
              {/* 
              Placeholder for password change fields:
              <FormField name="currentPassword" ... />
              <FormField name="newPassword" ... />
              <FormField name="confirmNewPassword" ... />
              */}
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
