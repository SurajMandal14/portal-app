
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookCopy, PlusCircle, Edit3, Trash2, Loader2, UserCheck, FilePlus, XCircle, Info } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createSchoolClass, getSchoolClasses, updateSchoolClass, deleteSchoolClass } from "@/app/actions/classes";
import { getSchoolUsers } from "@/app/actions/schoolUsers"; 
import type { SchoolClass, CreateClassFormData } from '@/types/classes';
import { createClassFormSchema } from '@/types/classes';
import type { AuthUser, User as AppUser } from "@/types/user";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';

const NONE_TEACHER_VALUE = "__NONE_TEACHER_OPTION__";

export default function AdminClassManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<AppUser[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CreateClassFormData>({
    resolver: zodResolver(createClassFormSchema),
    defaultValues: {
      name: "",
      classTeacherId: "", // Empty string signifies no teacher selected
      subjects: [{ name: "" }],
    },
  });

  const { fields: subjectFields, append: appendSubject, remove: removeSubject } = useFieldArray({
    control: form.control,
    name: "subjects",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin." });
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }
  }, [toast]);

  const fetchInitialData = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [classesResult, teachersResult] = await Promise.all([
        getSchoolClasses(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()) 
      ]);

      if (classesResult.success && classesResult.classes) {
        setSchoolClasses(classesResult.classes);
      } else {
        toast({ variant: "destructive", title: "Error", description: classesResult.message || "Failed to load classes." });
      }

      if (teachersResult.success && teachersResult.users) {
        setAvailableTeachers(teachersResult.users.filter(u => u.role === 'teacher'));
      } else {
         toast({ variant: "warning", title: "Teacher Info", description: teachersResult.message || "Failed to load teachers for dropdown." });
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching initial data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setSchoolClasses([]); setAvailableTeachers([]); }
  }, [authUser, fetchInitialData]);

  useEffect(() => {
    if (editingClass) {
      form.reset({
        name: editingClass.name,
        classTeacherId: editingClass.classTeacherId?.toString() || "",
        subjects: editingClass.subjects.length > 0 ? editingClass.subjects : [{ name: "" }],
      });
    } else {
      form.reset({ name: "", classTeacherId: "", subjects: [{ name: "" }] });
    }
  }, [editingClass, form]);

  async function onSubmit(values: CreateClassFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmitting(true);
    
    const result = editingClass
      ? await updateSchoolClass(editingClass._id.toString(), authUser.schoolId.toString(), values)
      : await createSchoolClass(authUser.schoolId.toString(), values);
    
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: editingClass ? "Class Updated" : "Class Created", description: result.message });
      handleCancelEdit();
      fetchInitialData();
    } else {
      toast({ variant: "destructive", title: `Error ${editingClass ? "Updating" : "Creating"} Class`, description: result.error || result.message });
    }
  }

  const handleEditClick = (cls: SchoolClass) => { setEditingClass(cls); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleCancelEdit = () => { setEditingClass(null); form.reset(); };
  const handleDeleteClick = (cls: SchoolClass) => setClassToDelete(cls);

  const handleConfirmDelete = async () => {
    if (!classToDelete?._id || !authUser?.schoolId) return;
    setIsDeleting(true);
    const result = await deleteSchoolClass(classToDelete._id.toString(), authUser.schoolId.toString());
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "Class Deleted", description: result.message });
      fetchInitialData();
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setClassToDelete(null);
  };
  
  if (!authUser && !isLoadingData) { 
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>Please log in as an admin.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookCopy className="mr-2 h-6 w-6" /> Class Management
          </CardTitle>
          <CardDescription>
            {editingClass ? `Editing Class: ${editingClass.name}` : "Create and manage classes, assign class teachers, and define subjects."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingClass ? "Edit Class" : "Add New Class"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Grade 10 - Section A" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="classTeacherId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCheck className="mr-2 h-4 w-4 text-muted-foreground"/>Assign Class Teacher (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === NONE_TEACHER_VALUE ? "" : value);
                      }}
                      value={field.value || ""} // If field.value is "", placeholder shows. If an ID, that teacher is selected.
                      disabled={isSubmitting || isLoadingData || availableTeachers.length === 0}
                    >
                      <FormControl><SelectTrigger>
                          <SelectValue placeholder={availableTeachers.length > 0 ? "Select a teacher" : "No teachers available"} />
                      </SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_TEACHER_VALUE}>None</SelectItem>
                        {availableTeachers.map(teacher => (
                          <SelectItem key={teacher._id!.toString()} value={teacher._id!.toString()}>{teacher.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">The class teacher can mark attendance for this class.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <div className="space-y-3">
                <FormLabel>Subjects Offered</FormLabel>
                {subjectFields.map((subjectItem, index) => (
                  <div key={subjectItem.id} className="flex items-end gap-2">
                    <FormField control={form.control} name={`subjects.${index}.name`} render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel htmlFor={`subject-${index}`} className="sr-only">Subject Name {index + 1}</FormLabel>
                        <FormControl>
                          <Input id={`subject-${index}`} placeholder={`Subject ${index + 1}`} {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    {subjectFields.length > 1 && (
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeSubject(index)} disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendSubject({ name: "" })} disabled={isSubmitting}>
                  <FilePlus className="mr-2 h-4 w-4"/>Add Subject
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || isLoadingData}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingClass ? "Update Class" : "Create Class"}
                </Button>
                {editingClass && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading classes...</p></div>
          ) : schoolClasses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolClasses.map((cls) => (
                <TableRow key={cls._id.toString()}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{(cls as any).classTeacherName || (cls.classTeacherId ? 'N/A' : 'Not Assigned')}</TableCell>
                  <TableCell>{cls.subjects.map(s => s.name).join(', ') || 'None'}</TableCell>
                  <TableCell>{format(new Date(cls.createdAt), "PP")}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(cls)} disabled={isSubmitting || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={classToDelete?._id === cls._id} onOpenChange={(open) => !open && setClassToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(cls)} disabled={isSubmitting || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {classToDelete && classToDelete._id === cls._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>Delete class <span className="font-semibold">{classToDelete.name}</span>? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setClassToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
            <div className="text-center py-6">
                <Info className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">No classes found for this school.</p>
                <p className="text-xs text-muted-foreground">Use the form above to create the first class.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

