
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, BookUser, XCircle, SquarePen, DollarSign, Bus, Info, CalendarIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { createSchoolUser, getSchoolUsers, updateSchoolUser, deleteSchoolUser } from "@/app/actions/schoolUsers";
import { 
    createStudentFormSchema, type CreateStudentFormData,
    updateSchoolUserFormSchema, type UpdateSchoolUserFormData,
    type CreateSchoolUserServerActionFormData
} from '@/types/user';
import { getSchoolById } from "@/app/actions/schools";
import { getClassesForSchoolAsOptions } from "@/app/actions/classes";
import type { User as AppUser } from "@/types/user";
import type { School, TermFee } from "@/types/school";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";

type SchoolStudent = Partial<AppUser>; 

const NONE_CLASS_VALUE = "__NONE_CLASS_ID__"; 

interface ClassOption {
  value: string; // class _id
  label: string; // "ClassName - Section"
  name?: string; // Original class name
  section?: string; // Original section
}

export default function AdminStudentManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null); 
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [allSchoolStudents, setAllSchoolStudents] = useState<SchoolStudent[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingStudent, setEditingStudent] = useState<SchoolStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<SchoolStudent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [calculatedTuitionFee, setCalculatedTuitionFee] = useState<number | null>(null);
  const [noTuitionFeeStructureFound, setNoTuitionFeeStructureFound] = useState(false);
  const [calculatedBusFee, setCalculatedBusFee] = useState<number | null>(null);
  const [noBusFeeStructureFound, setNoBusFeeStructureFound] = useState(false);
  const [selectedBusLocations, setSelectedBusLocations] = useState<string[]>([]);
  const [availableBusClassCategories, setAvailableBusClassCategories] = useState<string[]>([]);

  const studentForm = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", admissionId: "", classId: "", 
        enableBusTransport: false, busRouteLocation: "", busClassCategory: "",
        fatherName: "", motherName: "", dob: "", section: "", rollNo: "", examNo: "", aadharNo: ""
    },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", role: 'student', classId: "", admissionId: "", 
        enableBusTransport: false, busRouteLocation: "", busClassCategory: "",
        fatherName: "", motherName: "", dob: "", section: "", rollNo: "", examNo: "", aadharNo: ""
    },
  });
  const editEnableBusTransport = editForm.watch("enableBusTransport");

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
      const [schoolResult, usersResult, classesOptionsResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()),
        getClassesForSchoolAsOptions(authUser.schoolId.toString()) 
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
        const uniqueLocations = Array.from(new Set(schoolResult.school.busFeeStructures?.map(bfs => bfs.location) || []));
        setSelectedBusLocations(uniqueLocations.filter(Boolean) as string[]);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
        setSelectedBusLocations([]);
      }
      
      if (usersResult.success && usersResult.users) {
        setAllSchoolStudents(usersResult.users.filter(u => u.role === 'student'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load students." });
        setAllSchoolStudents([]);
      }

      setClassOptions(classesOptionsResult);
      if (classesOptionsResult.length === 0) {
         toast({ variant: "info", title: "No Classes", description: "No classes found. Please create classes first in Class Management." });
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setAllSchoolStudents([]); setSchoolDetails(null); setClassOptions([]); }
  }, [authUser, fetchInitialData]);

  const calculateAnnualFeeFromTerms = useCallback((terms: TermFee[]): number => {
    return terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);
  
  const selectedClassIdForTuition = studentForm.watch("classId");
  useEffect(() => {
    setNoTuitionFeeStructureFound(false);
    if (selectedClassIdForTuition && selectedClassIdForTuition !== NONE_CLASS_VALUE && schoolDetails?.tuitionFees && classOptions.length > 0) {
      const selectedClassOption = classOptions.find(cls => cls.value === selectedClassIdForTuition);
      if (selectedClassOption && selectedClassOption.name) {
        const feeConfig = schoolDetails.tuitionFees.find(tf => tf.className === selectedClassOption.name);
        if (feeConfig?.terms) {
          setCalculatedTuitionFee(calculateAnnualFeeFromTerms(feeConfig.terms));
        } else {
          setCalculatedTuitionFee(0); 
          setNoTuitionFeeStructureFound(true);
        }
      } else {
        setCalculatedTuitionFee(null);
      }
    } else {
      setCalculatedTuitionFee(null);
    }
  }, [selectedClassIdForTuition, schoolDetails, classOptions, calculateAnnualFeeFromTerms]);

  const studentFormEnableBus = studentForm.watch("enableBusTransport");
  const studentFormBusLocation = studentForm.watch("busRouteLocation");
  const studentFormBusCategory = studentForm.watch("busClassCategory");

  useEffect(() => {
    if (studentFormEnableBus && studentFormBusLocation && schoolDetails?.busFeeStructures) {
      const categories = schoolDetails.busFeeStructures
        .filter(bfs => bfs.location === studentFormBusLocation)
        .map(bfs => bfs.classCategory)
        .filter(Boolean) as string[];
      setAvailableBusClassCategories(Array.from(new Set(categories)));
      if (!categories.includes(studentForm.getValues("busClassCategory"))) {
        studentForm.setValue("busClassCategory", ""); 
      }
    } else {
      setAvailableBusClassCategories([]);
      if (!studentFormEnableBus) { 
         studentForm.setValue("busRouteLocation", "");
      }
      studentForm.setValue("busClassCategory", "");
    }
  }, [studentFormEnableBus, studentFormBusLocation, schoolDetails, studentForm]);

  useEffect(() => {
    setNoBusFeeStructureFound(false);
    if (studentFormEnableBus && studentFormBusLocation && studentFormBusCategory && schoolDetails?.busFeeStructures) {
      const feeConfig = schoolDetails.busFeeStructures.find(
        bfs => bfs.location === studentFormBusLocation && bfs.classCategory === studentFormBusCategory
      );
      if (feeConfig?.terms) {
        setCalculatedBusFee(calculateAnnualFeeFromTerms(feeConfig.terms));
      } else {
        setCalculatedBusFee(0);
        setNoBusFeeStructureFound(true);
      }
    } else {
      setCalculatedBusFee(null);
    }
  }, [studentFormEnableBus, studentFormBusLocation, studentFormBusCategory, schoolDetails, calculateAnnualFeeFromTerms]);

  const handleClassChangeForStudentForm = (classIdValue: string) => {
    studentForm.setValue('classId', classIdValue === NONE_CLASS_VALUE ? "" : classIdValue);
    const selectedClass = classOptions.find(opt => opt.value === classIdValue);
    studentForm.setValue('section', selectedClass?.section || '');
  };

  const handleClassChangeForEditForm = (classIdValue: string) => {
    editForm.setValue('classId', classIdValue === NONE_CLASS_VALUE ? "" : classIdValue);
    const selectedClass = classOptions.find(opt => opt.value === classIdValue);
    editForm.setValue('section', selectedClass?.section || '');
  };

  useEffect(() => {
    if (isFormOpen && editingStudent) {
      editForm.reset({
        name: editingStudent.name || "",
        email: editingStudent.email || "",
        password: "", 
        role: 'student', 
        classId: editingStudent.classId || "", 
        admissionId: editingStudent.admissionId || "",
        enableBusTransport: !!editingStudent.busRouteLocation,
        busRouteLocation: editingStudent.busRouteLocation || "",
        busClassCategory: editingStudent.busClassCategory || "",
        fatherName: editingStudent.fatherName || "",
        motherName: editingStudent.motherName || "",
        dob: editingStudent.dob || "",
        section: editingStudent.section || "",
        rollNo: editingStudent.rollNo || "",
        examNo: editingStudent.examNo || "",
        aadharNo: editingStudent.aadharNo || "",
      });
    }
  }, [editingStudent, isFormOpen, editForm]);

  async function handleStudentSubmit(values: CreateStudentFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmitting(true);
    const payload: CreateSchoolUserServerActionFormData = { 
        ...values, role: 'student', 
        classId: values.classId === NONE_CLASS_VALUE ? undefined : values.classId,
        busRouteLocation: values.enableBusTransport ? values.busRouteLocation : undefined,
        busClassCategory: values.enableBusTransport ? values.busClassCategory : undefined,
    };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Student Created", description: result.message });
      studentForm.reset();
      setCalculatedTuitionFee(null); setNoTuitionFeeStructureFound(false);
      setCalculatedBusFee(null); setNoBusFeeStructureFound(false);
      setIsFormOpen(false);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  async function handleEditSubmit(values: UpdateSchoolUserFormData) {
    if (!authUser?.schoolId || !editingStudent?._id) return;
    setIsSubmitting(true);
    const payload = { 
      ...values, role: 'student' as 'student', 
      classId: values.classId === NONE_CLASS_VALUE ? "" : values.classId, 
      busRouteLocation: values.enableBusTransport ? values.busRouteLocation : undefined,
      busClassCategory: values.enableBusTransport ? values.busClassCategory : undefined,
    };
    const result = await updateSchoolUser(editingStudent._id.toString(), authUser.schoolId.toString(), payload);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Student Updated", description: result.message });
      setEditingStudent(null);
      setIsFormOpen(false);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (student: SchoolStudent) => { 
    setEditingStudent(student);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const handleAddClick = () => {
    setEditingStudent(null);
    studentForm.reset();
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelClick = () => {
    setIsFormOpen(false);
    setEditingStudent(null);
  }

  const handleDeleteClick = (student: SchoolStudent) => setStudentToDelete(student);

  const handleConfirmDelete = async () => {
    if (!studentToDelete?._id || !authUser?.schoolId) return;
    setIsDeleting(true);
    const result = await deleteSchoolUser(studentToDelete._id.toString(), authUser.schoolId.toString());
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "Student Deleted", description: result.message });
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setStudentToDelete(null);
  };
  
  const filteredStudents = allSchoolStudents.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAnnualFee = (calculatedTuitionFee || 0) + (studentForm.getValues("enableBusTransport") && calculatedBusFee ? (calculatedBusFee || 0) : 0);

  const getClassNameFromId = (classId: string | undefined): string => {
    if (!classId) return 'N/A';
    const foundClass = classOptions.find(cls => cls.value === classId);
    return foundClass?.label || 'N/A (Invalid ID)';
  };

  if (!authUser && !isLoadingData) { 
    return (
      <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please log in as an admin.</p></CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center"><BookUser className="mr-2 h-6 w-6" /> Student Management</CardTitle>
          <CardDescription>Manage student accounts for {schoolDetails?.schoolName || "your school"}.</CardDescription>
        </CardHeader>
      </Card>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {editingStudent ? <><Edit3 className="mr-2 h-5 w-5"/>Edit Student: {editingStudent.name}</> : <><UserPlus className="mr-2 h-5 w-5"/>Add New Student</>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingStudent ? (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Leave blank to keep current password.</FormDescription><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="admissionId" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><SquarePen className="mr-2 h-4 w-4"/>Admission ID</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="fatherName" render={({ field }) => (<FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="motherName" render={({ field }) => (<FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="dob" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Date of Birth</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Assign to Class</FormLabel><Select onValueChange={handleClassChangeForEditForm} value={field.value || ""} disabled={isSubmitting || classOptions.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={classOptions.length > 0 ? "Select class" : "No classes available"} /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>{classOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>{classOptions.length === 0 && <FormDescription className="text-xs">No classes created yet.</FormDescription>}<FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="section" render={({ field }) => (<FormItem><FormLabel>Section</FormLabel><FormControl><Input placeholder="Auto from class" {...field} disabled readOnly /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="rollNo" render={({ field }) => (<FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="examNo" render={({ field }) => (<FormItem><FormLabel>Exam Number</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="aadharNo" render={({ field }) => (<FormItem><FormLabel>Aadhar Number</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="enableBusTransport" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2"><div className="space-y-0.5"><FormLabel>Enable Bus Transportation</FormLabel><FormDescription>Assign bus fees based on location and category.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} /></FormControl></FormItem>)}/>
                    {editEnableBusTransport && (<><FormField control={editForm.control} name="busRouteLocation" render={({ field }) => (<FormItem><FormLabel>Bus Location/Route</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || selectedBusLocations.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl><SelectContent>{selectedBusLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="busClassCategory" render={({ field }) => (<FormItem><FormLabel>Bus Class Category</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || availableBusClassCategories.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent>{schoolDetails?.busFeeStructures?.filter(bfs => bfs.location === editForm.getValues("busRouteLocation")).map(bfs => bfs.classCategory).filter((value, index, self) => self.indexOf(value) === index && value).map(cat => <SelectItem key={cat} value={cat!}>{cat!}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    </>)}
                  </div>
                  <div className="flex gap-2"><Button type="submit" disabled={isSubmitting || isLoadingData}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />} Update Student</Button><Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" />Cancel</Button></div>
                </form>
              </Form>
            ) : (
              <Form {...studentForm}>
                  <form onSubmit={studentForm.handleSubmit(handleStudentSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={studentForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="admissionId" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><SquarePen className="mr-2 h-4 w-4"/>Admission ID</FormLabel><FormControl><Input placeholder="e.g., S1001" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Assign to Class</FormLabel><Select onValueChange={handleClassChangeForStudentForm} value={field.value || ""} disabled={isSubmitting || classOptions.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={classOptions.length > 0 ? "Select class" : "No classes available"} /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>{classOptions.map((opt)=>(<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>{classOptions.length === 0 && <FormDescription className="text-xs">Create classes in Class Management first.</FormDescription>}{calculatedTuitionFee !== null && (<FormDescription className="text-xs pt-1">Annual Tuition Fee: <span className="font-sans">₹</span>{calculatedTuitionFee.toLocaleString()}{noTuitionFeeStructureFound && <span className="text-destructive"> (No fee structure found)</span>}</FormDescription>)}<FormMessage/></FormItem>)}/>
                      <FormField control={studentForm.control} name="fatherName" render={({ field }) => (<FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input placeholder="e.g., Robert Doe" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="motherName" render={({ field }) => (<FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input placeholder="e.g., Maria Doe" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="dob" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Date of Birth</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="section" render={({ field }) => (<FormItem><FormLabel>Section</FormLabel><FormControl><Input placeholder="Auto from class" {...field} disabled readOnly /></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="rollNo" render={({ field }) => (<FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="examNo" render={({ field }) => (<FormItem><FormLabel>Exam Number (Optional)</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="aadharNo" render={({ field }) => (<FormItem><FormLabel>Aadhar Number (Optional)</FormLabel><FormControl><Input placeholder="123456789012" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                      <div className="md:col-span-2" />
                      <FormField control={studentForm.control} name="enableBusTransport" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2"><div className="space-y-0.5"><FormLabel>Enable Bus Transportation</FormLabel><FormDescription>Assign bus fees based on location and category.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} /></FormControl></FormItem>)}/>
                      {studentForm.watch("enableBusTransport") && (<><FormField control={studentForm.control} name="busRouteLocation" render={({ field }) => (<FormItem><FormLabel>Bus Location/Route</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || selectedBusLocations.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl><SelectContent>{selectedBusLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                      <FormField control={studentForm.control} name="busClassCategory" render={({ field }) => (<FormItem><FormLabel>Bus Class Category</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || availableBusClassCategories.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent>{availableBusClassCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>{calculatedBusFee !== null && (<FormDescription className="text-xs pt-1">Annual Bus Fee: <span className="font-sans">₹</span>{calculatedBusFee.toLocaleString()}{noBusFeeStructureFound && <span className="text-destructive"> (No fee structure found)</span>}</FormDescription>)}<FormMessage /></FormItem>)}/>
                      </>)}
                      {(calculatedTuitionFee !== null || (studentForm.watch("enableBusTransport") && calculatedBusFee !== null)) && (<div className="md:col-span-2 mt-2 p-3 border rounded-md bg-muted/50"><h4 className="font-medium text-sm mb-1">Estimated Total Annual Fee:</h4><p className="text-lg font-semibold"><span className="font-sans">₹</span>{totalAnnualFee.toLocaleString()}</p><p className="text-xs text-muted-foreground">(Annual Tuition: <span className="font-sans">₹</span>{(calculatedTuitionFee || 0).toLocaleString()}){studentForm.watch("enableBusTransport") && calculatedBusFee !== null && ` + (Annual Bus Fee: ₹${(calculatedBusFee || 0).toLocaleString()})`}</p>{(noTuitionFeeStructureFound || (studentForm.watch("enableBusTransport") && noBusFeeStructureFound)) &&<p className="text-xs text-destructive mt-1">Note: One or more fee structures were not found.</p>}</div>)}
                  </div>
                  <div className="flex gap-2"><Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoadingData}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Add Student</Button><Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" />Cancel</Button></div>
                  </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Student List ({schoolDetails?.schoolName || "Your School"})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search students..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingData || !allSchoolStudents.length}/>
              <Button onClick={handleAddClick} disabled={isFormOpen && !editingStudent}><UserPlus className="mr-2 h-4 w-4"/>Add New Student</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading students...</p></div>
          ) : filteredStudents.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Admission ID</TableHead><TableHead>Class</TableHead><TableHead>Bus Route</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student._id?.toString()}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.admissionId || 'N/A'}</TableCell>
                  <TableCell>{getClassNameFromId(student.classId)}</TableCell>
                  <TableCell>{student.busRouteLocation ? `${student.busRouteLocation} (${student.busClassCategory || 'N/A'})` : 'N/A'}</TableCell>
                  <TableCell>{student.createdAt ? format(new Date(student.createdAt as string), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(student)} disabled={isSubmitting || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={studentToDelete?._id === student._id} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(student)} disabled={isSubmitting || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {studentToDelete && studentToDelete._id === student._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete <span className="font-semibold">{studentToDelete.name} ({studentToDelete.email})</span>?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel onClick={() => setStudentToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No students match search." : "No students found for this school."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
