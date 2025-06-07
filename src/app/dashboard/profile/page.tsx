"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Edit3, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Mock user data - replace with actual auth context later
const mockUser = {
  name: "Alex Johnson", // This would be dynamic
  email: "alex.johnson@example.com", // This would be dynamic
  role: "Admin", // This would be dynamic
  avatarUrl: "https://placehold.co/128x128.png",
  phone: "123-456-7890",
  department: "Administration" // Role specific detail
};

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional(), // Email might be non-editable
  phone: z.string().optional(),
  // Add other fields as necessary, e.g., password change
});

export default function ProfilePage() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: mockUser.name,
      email: mockUser.email,
      phone: mockUser.phone,
    },
  });

  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    // TODO: Implement actual profile update logic
    console.log("Updating profile:", values);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been successfully updated.",
    });
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
              <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} data-ai-hint="profile avatar" />
              <AvatarFallback>{mockUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{mockUser.name}</CardTitle>
              <p className="text-muted-foreground">{mockUser.email}</p>
              <p className="text-sm text-muted-foreground capitalize">{mockUser.role} {mockUser.department && `- ${mockUser.department}`}</p>
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
                    <FormDescription>Email address cannot be changed.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Add fields for password change if needed */}
              {/* Example:
              <FormField name="currentPassword" ... />
              <FormField name="newPassword" ... />
              <FormField name="confirmNewPassword" ... />
              */}
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
