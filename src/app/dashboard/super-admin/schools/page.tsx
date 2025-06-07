
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// Label import kept as FormLabel uses it internally or as a base
import { PlusCircle, School, Upload, DollarSign, Bus, Utensils, Loader2 } from "lucide-react";
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
import { createSchool, getSchools } from "@/app/actions/schools";
import { schoolFormSchema, type SchoolFormData } from "@/types/school"; // Import from shared location
import type { School as SchoolType } from "@/types/school";
import { useEffect, useState } from "react";
import Image from "next/image"; // For displaying logos

// Client-side Zod schemas are now imported from '@/types/school'
// const classFeeClientSchema = ...
// const schoolClientFormSchema = ...


export default function SchoolManagementPage() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SchoolFormData>({ // Use SchoolFormData directly
    resolver: zodResolver(schoolFormSchema), // Use imported schoolFormSchema
    defaultValues: {
      schoolName: "",
      classFees: [{ className: "", tuitionFee: 0, busFee: 0, canteenFee: 0 }],
      schoolLogo: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "classFees",
  });

  const fetchSchools = async () => {
    setIsLoadingSchools(true);
    const result = await getSchools();
    if (result.success && result.schools) {
      setSchools(result.schools);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to load schools",
        description: result.error || "Could not fetch school data.",
      });
    }
    setIsLoadingSchools(false);
  };

  useEffect(() => {
    fetchSchools();
  }, [toast]); // Added toast to dependencies as it's used in fetchSchools

  async function onSubmit(values: SchoolFormData) { // Values are already SchoolFormData
    setIsSubmitting(true);
    const result = await createSchool(values); 
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "School Created",
        description: result.message,
      });
      form.reset(); 
      fetchSchools(); 
    } else {
      toast({
        variant: "destructive",
        title: "Error Creating School",
        description: result.error || result.message,
      });
    }
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
                      <Input placeholder="e.g., Springfield Elementary" {...field} disabled={isSubmitting} />
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
                    <FormLabel>School Logo (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} 
                          className="max-w-xs"
                          disabled={isSubmitting}
                        />
                        <Upload className="h-5 w-5 text-muted-foreground"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground pt-1">Upload a PNG, JPG, or GIF file (max 2MB). Actual upload not yet implemented.</p>
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
                              <Input placeholder="e.g., Grade 10A" {...field} disabled={isSubmitting} />
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
                              <Input type="number" placeholder="e.g., 5000" {...field} disabled={isSubmitting} />
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
                              <Input type="number" placeholder="e.g., 500" {...field} disabled={isSubmitting}/>
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
                              <Input type="number" placeholder="e.g., 300" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     {fields.length > 1 && (
                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="mt-2" disabled={isSubmitting}>
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
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Class Configuration
                </Button>
              </div>
              
              <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating..." : "Create School Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Schools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSchools ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading schools...</p>
            </div>
          ) : schools.length > 0 ? (
            schools.map(school => (
            <Card key={school._id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Image 
                    src={school.schoolLogoUrl || "https://placehold.co/100x100.png"} 
                    alt={`${school.schoolName} logo`} 
                    data-ai-hint="school logo"
                    width={48} 
                    height={48} 
                    className="h-12 w-12 rounded-md object-cover" 
                />
                <div>
                  <h3 className="font-semibold">{school.schoolName}</h3>
                  <p className="text-sm text-muted-foreground">{school.classFees.length} classes configured</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>Edit</Button> 
            </Card>
          ))
          ) : (
             <p className="text-muted-foreground text-center py-4">No schools created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
