
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, School as SchoolIconUI, Upload, DollarSign, Bus, Utensils, Loader2, Edit, XCircle, FileText } from "lucide-react"; // Renamed School to SchoolIconUI
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
import { createSchool, getSchools, updateSchool } from "@/app/actions/schools";
import { schoolFormSchema, type SchoolFormData, REPORT_CARD_TEMPLATES, type ReportCardTemplateKey } from '@/types/school'; 
import type { School as SchoolType } from "@/types/school";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

export default function SchoolManagementPage() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      schoolName: "",
      classFees: [{ className: "", tuitionFee: 0, busFee: 0, canteenFee: 0 }],
      schoolLogo: undefined,
      reportCardTemplate: 'none',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "classFees",
  });

  const fetchSchools = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const mapSchoolToFormData = (school: SchoolType): SchoolFormData => ({
    schoolName: school.schoolName,
    schoolLogo: undefined, 
    reportCardTemplate: school.reportCardTemplate || 'none',
    classFees: school.classFees.map(cf => ({ 
      className: cf.className,
      tuitionFee: cf.tuitionFee,
      busFee: cf.busFee || 0,
      canteenFee: cf.canteenFee || 0,
    })),
  });

  const handleEdit = (school: SchoolType) => {
    setEditingSchool(school);
    form.reset(mapSchoolToFormData(school));
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const cancelEdit = () => {
    setEditingSchool(null);
    form.reset({
      schoolName: "",
      classFees: [{ className: "", tuitionFee: 0, busFee: 0, canteenFee: 0 }],
      schoolLogo: undefined,
      reportCardTemplate: 'none',
    });
  };

  async function onSubmit(values: SchoolFormData) {
    setIsSubmitting(true);
    let result;

    if (editingSchool) {
      result = await updateSchool(editingSchool._id, values);
    } else {
      result = await createSchool(values);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: editingSchool ? "School Updated" : "School Created",
        description: result.message,
      });
      fetchSchools();
      cancelEdit(); 
    } else {
      toast({
        variant: "destructive",
        title: `Error ${editingSchool ? "Updating" : "Creating"} School`,
        description: result.error || result.message,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <SchoolIconUI className="mr-2 h-6 w-6" /> School Management 
          </CardTitle>
          <CardDescription>
            {editingSchool ? `Editing: ${editingSchool.schoolName}` : "Create new schools, configure class-wise fees, logos, and report card templates."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingSchool ? "Edit School Profile" : "Create New School"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                render={({ field: { onChange, value, ...restField }}) => ( 
                  <FormItem>
                    <FormLabel>School Logo (Optional {editingSchool ? "- Re-upload to change" : ""})</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                          className="max-w-xs"
                          disabled={isSubmitting}
                          {...restField}
                        />
                        <Upload className="h-5 w-5 text-muted-foreground"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground pt-1">
                       Upload a PNG, JPG, or GIF file (max 2MB). Actual upload/storage not yet fully implemented.
                       {editingSchool && editingSchool.schoolLogoUrl && " Current logo will be retained if no new file is uploaded."}
                     </p>
                  </FormItem>
                )}
              />
                <FormField
                  control={form.control}
                  name="reportCardTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Report Card Template</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a report card template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(REPORT_CARD_TEMPLATES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


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
                              <Input type="number" placeholder="e.g., 5000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isSubmitting} />
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
                              <Input type="number" placeholder="e.g., 500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isSubmitting}/>
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
                              <Input type="number" placeholder="e.g., 300" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isSubmitting}/>
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
              
              <div className="flex gap-2">
                <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? (editingSchool ? "Updating..." : "Creating...") : (editingSchool ? "Update School Profile" : "Create School Profile")}
                </Button>
                {editingSchool && (
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSubmitting}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                  </Button>
                )}
              </div>
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
            <Card key={school._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-4">
                <Image 
                    src={school.schoolLogoUrl || "https://placehold.co/100x100.png"} 
                    alt={`${school.schoolName} logo`} 
                    data-ai-hint="school logo"
                    width={48} 
                    height={48} 
                    className="h-12 w-12 rounded-md object-cover flex-shrink-0" 
                />
                <div className="flex-grow">
                  <h3 className="font-semibold">{school.schoolName}</h3>
                  <p className="text-sm text-muted-foreground">{school.classFees.length} class configuration(s)</p>
                  <p className="text-xs text-muted-foreground">Report Card: <span className="font-medium">{REPORT_CARD_TEMPLATES[school.reportCardTemplate || 'none']}</span></p>
                  <p className="text-xs text-muted-foreground">Created: {new Date(school.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">Last Updated: {new Date(school.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(school)} className="w-full sm:w-auto flex-shrink-0">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button> 
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
