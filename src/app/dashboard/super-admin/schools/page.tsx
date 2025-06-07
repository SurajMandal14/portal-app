"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, School, Upload, DollarSign, Bus, Utensils } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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

const classFeeSchema = z.object({
  className: z.string().min(1, "Class name is required"),
  tuitionFee: z.coerce.number().min(0, "Tuition fee must be positive"),
  busFee: z.coerce.number().min(0, "Bus fee must be positive").optional(),
  canteenFee: z.coerce.number().min(0, "Canteen fee must be positive").optional(),
});

const schoolFormSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters."),
  schoolLogo: z.any().optional(), // Handle file upload
  classFees: z.array(classFeeSchema).min(1, "At least one class configuration is required."),
});

// Mock data for existing schools
const mockSchools = [
  { id: "1", name: "Greenwood High", logoUrl: "https://placehold.co/100x100.png", classes: 5 },
  { id: "2", name: "Oakridge International", logoUrl: "https://placehold.co/100x100.png", classes: 8 },
];


export default function SchoolManagementPage() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof schoolFormSchema>>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      schoolName: "",
      classFees: [{ className: "", tuitionFee: 0, busFee: 0, canteenFee: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "classFees",
  });

  function onSubmit(values: z.infer<typeof schoolFormSchema>) {
    // TODO: Implement actual school creation logic
    console.log(values);
    toast({
      title: "School Configuration Saved",
      description: `Configuration for ${values.schoolName} has been submitted.`,
    });
    form.reset();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center"><School className="mr-2 h-6 w-6" /> School Management</CardTitle>
          <CardDescription>Create new schools, configure class-wise fees, and upload school logos.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create New School</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Springfield Elementary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="schoolLogo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Logo</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} className="max-w-xs"/>
                        <Upload className="h-5 w-5 text-muted-foreground"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground pt-1">Upload a PNG, JPG, or GIF file (max 2MB).</p>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Class-wise Fees Configuration</FormLabel>
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                      <FormField
                        control={form.control}
                        name={`classFees.${index}.className`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Grade 10A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`classFees.${index}.tuitionFee`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><DollarSign className="h-4 w-4 mr-1 text-muted-foreground"/>Tuition Fee</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 5000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`classFees.${index}.busFee`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Bus className="h-4 w-4 mr-1 text-muted-foreground"/>Bus Fee (Optional)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 500" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`classFees.${index}.canteenFee`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Utensils className="h-4 w-4 mr-1 text-muted-foreground"/>Canteen Fee (Optional)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 300" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     {fields.length > 1 && (
                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="mt-2">
                          Remove Class
                        </Button>
                      )}
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ className: "", tuitionFee: 0, busFee: 0, canteenFee: 0 })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Class Configuration
                </Button>
              </div>
              
              <Button type="submit" className="w-full md:w-auto">Create School Profile</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Schools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockSchools.map(school => (
            <Card key={school.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <img src={school.logoUrl} alt={`${school.name} logo`} data-ai-hint="school logo" className="h-12 w-12 rounded-md object-cover" />
                <div>
                  <h3 className="font-semibold">{school.name}</h3>
                  <p className="text-sm text-muted-foreground">{school.classes} classes configured</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </Card>
          ))}
           {mockSchools.length === 0 && <p className="text-muted-foreground">No schools created yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
