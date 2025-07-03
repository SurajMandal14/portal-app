
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Construction, CheckSquare, Lock, School as SchoolIcon, Loader2, Save, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getSchools, getSchoolById, updateSchoolOperationalSettings } from "@/app/actions/schools";
import { operationalSettingsSchema, type OperationalSettingsFormData, type School } from "@/types/school";
import { useState, useEffect, useCallback } from "react";

const assessmentKeys: (keyof OperationalSettingsFormData['marksEntryLocks'])[] = ["FA1", "FA2", "FA3", "FA4", "SA1", "SA2"];

export default function MasterAdminSettingsPage() {
    const { toast } = useToast();
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [isLoadingSchools, setIsLoadingSchools] = useState(true);
    const [isLoadingSchoolDetails, setIsLoadingSchoolDetails] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<OperationalSettingsFormData>({
        resolver: zodResolver(operationalSettingsSchema),
        defaultValues: {
            attendanceType: 'monthly',
            activeAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            marksEntryLocks: { FA1: false, FA2: false, FA3: false, FA4: false, SA1: false, SA2: false },
        }
    });

    const handleSchoolSelect = useCallback(async (schoolId: string) => {
        if (!schoolId) {
            setSelectedSchool(null);
            form.reset();
            return;
        }
        setIsLoadingSchoolDetails(true);
        const result = await getSchoolById(schoolId);
        if(result.success && result.school) {
            setSelectedSchool(result.school);
            form.reset({
                attendanceType: result.school.attendanceType || 'monthly',
                activeAcademicYear: result.school.activeAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                marksEntryLocks: result.school.marksEntryLocks || { FA1: false, FA2: false, FA3: false, FA4: false, SA1: false, SA2: false },
            });
        } else {
            toast({ variant: 'destructive', title: "Error", description: "Failed to load school details."});
            setSelectedSchool(null);
        }
        setIsLoadingSchoolDetails(false);
    }, [form, toast]);

    useEffect(() => {
        async function loadSchools() {
            setIsLoadingSchools(true);
            const result = await getSchools();
            if(result.success && result.schools) {
                setSchools(result.schools);
            } else {
                toast({ variant: 'destructive', title: "Error", description: 'Could not load schools list.' });
            }
            setIsLoadingSchools(false);
        }
        loadSchools();
    }, [toast]);
    
    async function onSubmit(values: OperationalSettingsFormData) {
        if (!selectedSchool) {
            toast({variant: 'warning', title: 'No School Selected', description: 'Please select a school to update.'});
            return;
        }
        setIsSubmitting(true);
        const result = await updateSchoolOperationalSettings(selectedSchool._id, values);
        if (result.success) {
            toast({ title: 'Settings Updated', description: result.message });
            if(result.school) setSelectedSchool(result.school); // Refresh display with updated data
        } else {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error || result.message });
        }
        setIsSubmitting(false);
    }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Settings className="mr-2 h-6 w-6" /> School Operational Settings
          </CardTitle>
          <CardDescription>
            Manage attendance types, academic years, and marks entry permissions for schools.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="max-w-md">
                <Label htmlFor="school-select">Select a School to Manage</Label>
                <Select onValueChange={handleSchoolSelect} disabled={isLoadingSchools || isSubmitting}>
                    <SelectTrigger id="school-select">
                        <SelectValue placeholder={isLoadingSchools ? "Loading..." : "Select school"} />
                    </SelectTrigger>
                    <SelectContent>
                        {schools.map(school => <SelectItem key={school._id} value={school._id}>{school.schoolName}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>
      
      {isLoadingSchoolDetails && <div className="text-center p-6"><Loader2 className="h-8 w-8 animate-spin"/></div>}

      {selectedSchool && !isLoadingSchoolDetails && (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Attendance Settings for {selectedSchool.schoolName}</CardTitle>
                    <CardDescription>Control how attendance is marked.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="attendanceType"
                        render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel>Attendance Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly Calendar View</SelectItem>
                                        <SelectItem value="daily" disabled>Daily List (Coming Soon)</SelectItem>
                                        <SelectItem value="qr" disabled>QR Code Based (Coming Soon)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Academic Year Settings</CardTitle>
                    <CardDescription>Set the active academic year for the school.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="activeAcademicYear"
                        render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel>Active Academic Year</FormLabel>
                                <FormControl><Input placeholder="e.g., 2024-2025" {...field} value={field.value || ""} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Marks Entry Lock</CardTitle>
                    <CardDescription>Enable or disable marks entry for specific assessments for {selectedSchool.schoolName}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assessmentKeys.map(key => (
                        <FormField
                            key={key}
                            control={form.control}
                            name={`marksEntryLocks.${key}`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base flex items-center">
                                            {field.value ? <Lock className="mr-2 h-4 w-4 text-destructive"/> : <Unlock className="mr-2 h-4 w-4 text-green-600"/>}
                                            {key} Entry
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">{field.value ? 'Locked' : 'Unlocked'}</p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Save Settings for {selectedSchool.schoolName}
                </Button>
            </div>
        </form>
      </Form>
      )}
    </div>
  );
}
