
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, BookUser, Briefcase, XCircle, SquarePen, DollarSign, Bus, Info, CalendarIcon } from "lucide-react"; // Added CalendarIcon
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createSchoolUser, getSchoolUsers, updateSchoolUser, deleteSchoolUser } from "@/app/actions/schoolUsers";
import { 
    createStudentFormSchema, type CreateStudentFormData,
    createTeacherFormSchema, type CreateTeacherFormData,
    updateSchoolUserFormSchema, type UpdateSchoolUserFormData,
    type CreateSchoolUserServerActionFormData
} from '@/types/user';
import { getSchoolById } from "@/app/actions/schools";
import { getSchoolClasses } from "@/app/actions/classes"; 
import type { User as AppUser } from "@/types/user";
import type { School, TermFee } from "@/types/school";
import type { SchoolClass } from "@/types/classes"; 
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";

type SchoolUser = Partial<AppUser>; 

const NONE_CLASS_VALUE = "__NONE_CLASS_ID__"; 

export default function AdminUserManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null); 
  const [managedClasses, setManagedClasses] = useState<SchoolClass[]>([]); 
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<SchoolUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SchoolUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("addStudent");

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

  const teacherForm = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherFormSchema),
    defaultValues: { name: "", email: "", password: "", classId: "" },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", role: undefined, classId: "", admissionId: "", 
        enableBusTransport: false, busRouteLocation: "", busClassCategory: "",
        fatherName: "", motherName: "", dob: "", section: "", rollNo: "", examNo: "", aadharNo: ""
    },
  });
  const editingUserRole = editForm.watch("role");
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
      const [schoolResult, usersResult, classesResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()),
        getSchoolClasses(authUser.schoolId.toString()) 
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
        const uniqueLocations = Array.from(new Set(schoolResult.school.busFeeStructures?.map(bfs => bfs.location) || []));
        setSelectedBusLocations(uniqueLocations.filter(Boolean));
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
        setSelectedBusLocations([]);
      }
      

      if (usersResult.success && usersResult.users) {
        setSchoolUsers(usersResult.users);
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load users." });
      }

      if (classesResult.success && classesResult.classes) {
        setManagedClasses(classesResult.classes);
      } else {
        toast({ variant: "warning", title: "Class List Error", description: classesResult.message || "Failed to load managed class list." });
        setManagedClasses([]);
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setSchoolUsers([]); setSchoolDetails(null); setManagedClasses([]); }
  }, [authUser, fetchInitialData]);

  const calculateAnnualFeeFromTerms = useCallback((terms: TermFee[]): number => {
    return terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);
  
  const selectedClassIdForTuition = studentForm.watch("classId");
  useEffect(() => {
    setNoTuitionFeeStructureFound(false);
    if (selectedClassIdForTuition && selectedClassIdForTuition !== NONE_CLASS_VALUE && schoolDetails?.tuitionFees && managedClasses.length > 0) {
      const selectedClass = managedClasses.find(cls => cls._id === selectedClassIdForTuition);
      if (selectedClass) {
        const feeConfig = schoolDetails.tuitionFees.find(tf => tf.className === selectedClass.name);
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
  }, [selectedClassIdForTuition, schoolDetails, managedClasses, calculateAnnualFeeFromTerms]);


  const studentFormEnableBus = studentForm.watch("enableBusTransport");
  const studentFormBusLocation = studentForm.watch("busRouteLocation");
  const studentFormBusCategory = studentForm.watch("busClassCategory");

  useEffect(() => {
    if (studentFormEnableBus && studentFormBusLocation && schoolDetails?.busFeeStructures) {
      const categories = schoolDetails.busFeeStructures
        .filter(bfs => bfs.location === studentFormBusLocation)
        .map(bfs => bfs.classCategory)
        .filter(Boolean);
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


  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name: editingUser.name || "",
        email: editingUser.email || "",
        password: "", 
        role: editingUser.role as 'teacher' | 'student' | undefined,
        classId: editingUser.classId || "", 
        admissionId: editingUser.admissionId || "",
        enableBusTransport: !!editingUser.busRouteLocation,
        busRouteLocation: editingUser.busRouteLocation || "",
        busClassCategory: editingUser.busClassCategory || "",
        fatherName: editingUser.fatherName || "",
        motherName: editingUser.motherName || "",
        dob: editingUser.dob || "",
        section: editingUser.section || "",
        rollNo: editingUser.rollNo || "",
        examNo: editingUser.examNo || "",
        aadharNo: editingUser.aadharNo || "",
      });
    } else {
      editForm.reset({ 
        name: "", email: "", password: "", role: undefined, classId: "", admissionId: "", 
        enableBusTransport: false, busRouteLocation: "", busClassCategory:"",
        fatherName: "", motherName: "", dob: "", section: "", rollNo: "", examNo: "", aadharNo: ""
      });
    }
  }, [editingUser, editForm]);

  async function handleStudentSubmit(values: CreateStudentFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmittingStudent(true);
    const payload: CreateSchoolUserServerActionFormData = { 
        ...values, 
        role: 'student', 
        classId: values.classId === NONE_CLASS_VALUE ? undefined : values.classId,
        busRouteLocation: values.enableBusTransport ? values.busRouteLocation : undefined,
        busClassCategory: values.enableBusTransport ? values.busClassCategory : undefined,
    };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmittingStudent(false);
    if (result.success) {
      toast({ title: "Student Created", description: result.message });
      studentForm.reset();
      setCalculatedTuitionFee(null);
      setNoTuitionFeeStructureFound(false);
      setCalculatedBusFee(null);
      setNoBusFeeStructureFound(false);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }

  async function handleTeacherSubmit(values: CreateTeacherFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmittingTeacher(true);
    const payload: CreateSchoolUserServerActionFormData = { 
        ...values, 
        role: 'teacher', 
        classId: values.classId === NONE_CLASS_VALUE ? undefined : values.classId 
    };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmittingTeacher(false);
    if (result.success) {
      toast({ title: "Teacher Created", description: result.message });
      teacherForm.reset();
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  async function handleEditSubmit(values: UpdateSchoolUserFormData) {
    if (!authUser?.schoolId || !editingUser?._id) return;
    setIsSubmittingEdit(true);
    const payload = { 
      ...values, 
      classId: values.classId === NONE_CLASS_VALUE ? "" : values.classId, 
      busRouteLocation: values.enableBusTransport && values.role === 'student' ? values.busRouteLocation : undefined,
      busClassCategory: values.enableBusTransport && values.role === 'student' ? values.busClassCategory : undefined,
    };
    const result = await updateSchoolUser(editingUser._id.toString(), authUser.schoolId.toString(), payload);
    setIsSubmittingEdit(false);
    if (result.success) {
      toast({ title: "User Updated", description: result.message });
      setEditingUser(null);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (user: SchoolUser) => { setEditingUser(user); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => setEditingUser(null);
  const handleDeleteClick = (user: SchoolUser) => setUserToDelete(user);

  const handleConfirmDelete = async () => {
    if (!userToDelete?._id || !authUser?.schoolId) return;
    setIsDeleting(true);
    const result = await deleteSchoolUser(userToDelete._id.toString(), authUser.schoolId.toString());
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "User Deleted", description: result.message });
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setUserToDelete(null);
  };
  
  const filteredUsers = schoolUsers.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAnnualFee = (calculatedTuitionFee || 0) + (studentForm.getValues("enableBusTransport") && calculatedBusFee ? (calculatedBusFee || 0) : 0);

  const getClassNameFromId = (classId: string | undefined): string => {
    if (!classId) return 'N/A';
    const foundClass = managedClasses.find(cls => cls._id === classId);
    return foundClass?.name || 'N/A (Invalid ID)';
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
            <Users className="mr-2 h-6 w-6" /> School User Management
          </CardTitle>
          <CardDescription>
            Manage teacher and student accounts for {schoolDetails?.schoolName || "your school"}.
          </CardDescription>
        </CardHeader>
      </Card>

      {editingUser ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Edit3 className="mr-2 h-5 w-5"/>Edit User: {editingUser.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmittingEdit} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmittingEdit} /></FormControl>
                        <FormDescription className="text-xs">Leave blank to keep current password.</FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}/>
                   <FormField control={editForm.control} name="role" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={true}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="teacher">Teacher</SelectItem>
                                  <SelectItem value="student">Student</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">Role cannot be changed after creation.</FormDescription>
                          <FormMessage />
                      </FormItem>
                   )}/>
                   {editingUserRole === 'student' && (
                      <>
                        <FormField control={editForm.control} name="admissionId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><SquarePen className="mr-2 h-4 w-4"/>Admission ID</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmittingEdit} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={editForm.control} name="fatherName" render={({ field }) => (
                            <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={editForm.control} name="motherName" render={({ field }) => (
                            <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={editForm.control} name="dob" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Date of Birth</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={editForm.control} name="section" render={({ field }) => (
                            <FormItem><FormLabel>Section</FormLabel><FormControl><Input placeholder="e.g., A, B" {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={editForm.control} name="rollNo" render={({ field }) => (
                            <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={editForm.control} name="examNo" render={({ field }) => (
                            <FormItem><FormLabel>Exam Number</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={editForm.control} name="aadharNo" render={({ field }) => (
                            <FormItem><FormLabel>Aadhar Number</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit}/></FormControl><FormMessage /></FormItem>
                        )}/>
                      </>
                   )}
                    <FormField 
                        control={editForm.control} 
                        name="classId" 
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assign to Class</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value === NONE_CLASS_VALUE ? "" : value)}
                                    value={field.value || ""} 
                                    disabled={isSubmittingEdit || managedClasses.length === 0}
                                >
                                    <FormControl><SelectTrigger>
                                        <SelectValue placeholder={managedClasses.length > 0 ? "Select class" : "No classes available"} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>
                                        {managedClasses.map((cls) => (
                                            <SelectItem key={cls._id} value={cls._id.toString()}>{cls.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {managedClasses.length === 0 && <FormDescription className="text-xs">No classes created yet. Please create classes in Class Management first.</FormDescription>}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {editingUserRole === 'student' && (
                        <>
                            <FormField
                                control={editForm.control}
                                name="enableBusTransport"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                                        <div className="space-y-0.5">
                                            <FormLabel>Enable Bus Transportation</FormLabel>
                                            <FormDescription>Assign bus fees based on location and category.</FormDescription>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            {editEnableBusTransport && (
                                <>
                                    <FormField control={editForm.control} name="busRouteLocation" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bus Location/Route</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingEdit || selectedBusLocations.length === 0}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {selectedBusLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={editForm.control} name="busClassCategory" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bus Class Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingEdit || availableBusClassCategories.length === 0}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                     {schoolDetails?.busFeeStructures?.filter(bfs => bfs.location === editForm.getValues("busRouteLocation")).map(bfs => bfs.classCategory).filter((value, index, self) => self.indexOf(value) === index && value).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </>
                            )}
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmittingEdit || isLoadingData}>
                    {isSubmittingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                    Update User
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSubmittingEdit}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:w-1/2">
            <TabsTrigger value="addStudent"><BookUser className="mr-2"/>Add Student</TabsTrigger>
            <TabsTrigger value="addTeacher"><Briefcase className="mr-2"/>Add Teacher</TabsTrigger>
          </TabsList>
          <TabsContent value="addStudent">
            <Card>
              <CardHeader><CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5"/>Add New Student</CardTitle></CardHeader>
              <CardContent>
                <Form {...studentForm}>
                  <form onSubmit={studentForm.handleSubmit(handleStudentSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={studentForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={studentForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={studentForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={studentForm.control} name="admissionId" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><SquarePen className="mr-2 h-4 w-4"/>Admission ID</FormLabel><FormControl><Input placeholder="e.g., S1001" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={studentForm.control} name="classId" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Assign to Class</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value === NONE_CLASS_VALUE ? "" : value)} 
                                    value={field.value || ""} 
                                    disabled={isSubmittingStudent || managedClasses.length === 0}
                                >
                                    <FormControl><SelectTrigger>
                                        <SelectValue placeholder={managedClasses.length > 0 ? "Select class" : "No classes available"} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>
                                        {managedClasses.map((cls)=>(<SelectItem key={cls._id} value={cls._id.toString()}>{cls.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                {managedClasses.length === 0 && <FormDescription className="text-xs">No classes created yet. Please create classes in Class Management first.</FormDescription>}
                                {calculatedTuitionFee !== null && (
                                    <FormDescription className="text-xs pt-1">
                                        Annual Tuition Fee: <span className="font-sans">₹</span>{calculatedTuitionFee.toLocaleString()}
                                        {noTuitionFeeStructureFound && <span className="text-destructive"> (No fee structure found for this class)</span>}
                                    </FormDescription>
                                )}
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={studentForm.control} name="fatherName" render={({ field }) => (
                            <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input placeholder="e.g., Robert Doe" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={studentForm.control} name="motherName" render={({ field }) => (
                            <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input placeholder="e.g., Maria Doe" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={studentForm.control} name="dob" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Date of Birth</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={studentForm.control} name="section" render={({ field }) => (
                            <FormItem><FormLabel>Section</FormLabel><FormControl><Input placeholder="e.g., A, B" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={studentForm.control} name="rollNo" render={({ field }) => (
                            <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={studentForm.control} name="examNo" render={({ field }) => (
                            <FormItem><FormLabel>Exam Number (Optional)</FormLabel><FormControl><Input {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={studentForm.control} name="aadharNo" render={({ field }) => (
                            <FormItem><FormLabel>Aadhar Number (Optional)</FormLabel><FormControl><Input placeholder="123456789012" {...field} disabled={isSubmittingStudent}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        
                        <div className="md:col-span-2" />

                        <FormField
                            control={studentForm.control}
                            name="enableBusTransport"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                                    <div className="space-y-0.5">
                                        <FormLabel>Enable Bus Transportation</FormLabel>
                                        <FormDescription>Assign bus fees based on location and category.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingStudent} /></FormControl>
                                </FormItem>
                            )}
                        />
                        {studentForm.watch("enableBusTransport") && (
                            <>
                                <FormField control={studentForm.control} name="busRouteLocation" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bus Location/Route</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingStudent || selectedBusLocations.length === 0}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {selectedBusLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={studentForm.control} name="busClassCategory" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bus Class Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingStudent || availableBusClassCategories.length === 0}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {availableBusClassCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {calculatedBusFee !== null && (
                                            <FormDescription className="text-xs pt-1">
                                                Annual Bus Fee: <span className="font-sans">₹</span>{calculatedBusFee.toLocaleString()}
                                                {noBusFeeStructureFound && <span className="text-destructive"> (No fee structure found for this route/category)</span>}
                                            </FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </>
                        )}
                         {(calculatedTuitionFee !== null || (studentForm.watch("enableBusTransport") && calculatedBusFee !== null)) && (
                            <div className="md:col-span-2 mt-2 p-3 border rounded-md bg-muted/50">
                                <h4 className="font-medium text-sm mb-1">Estimated Total Annual Fee:</h4>
                                <p className="text-lg font-semibold">
                                    <span className="font-sans">₹</span>{totalAnnualFee.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    (Annual Tuition: <span className="font-sans">₹</span>{(calculatedTuitionFee || 0).toLocaleString()})
                                    {studentForm.watch("enableBusTransport") && calculatedBusFee !== null && 
                                     ` + (Annual Bus Fee: ₹${(calculatedBusFee || 0).toLocaleString()})`}
                                </p>
                                {(noTuitionFeeStructureFound || (studentForm.watch("enableBusTransport") && noBusFeeStructureFound)) &&
                                    <p className="text-xs text-destructive mt-1">Note: One or more fee structures were not found. The total fee may be incomplete.</p>
                                }
                            </div>
                        )}
                    </div>
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmittingStudent || isLoadingData}>{isSubmittingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Add Student</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="addTeacher">
            <Card>
              <CardHeader><CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5"/>Add New Teacher</CardTitle></CardHeader>
              <CardContent>
                 <Form {...teacherForm}>
                  <form onSubmit={teacherForm.handleSubmit(handleTeacherSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={teacherForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Teacher" {...field} disabled={isSubmittingTeacher}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={teacherForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="teacher@example.com" {...field} disabled={isSubmittingTeacher}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={teacherForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmittingTeacher}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={teacherForm.control} name="classId" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Assign as Class Teacher (Optional)</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value === NONE_CLASS_VALUE ? "" : value)} 
                                    value={field.value || ""} 
                                    disabled={isSubmittingTeacher || managedClasses.length === 0}
                                >
                                    <FormControl><SelectTrigger>
                                        <SelectValue placeholder={managedClasses.length > 0 ? "Select class if class teacher" : "No classes available"} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>
                                        {managedClasses.map((cls)=>(<SelectItem key={cls._id} value={cls._id.toString()}>{cls.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">Assigning here makes them the primary class teacher for attendance.</FormDescription>
                                {managedClasses.length === 0 && <FormDescription className="text-xs">No classes created yet. Please create classes in Class Management first.</FormDescription>}
                                <FormMessage/>
                            </FormItem>
                        )}/>
                    </div>
                     <Button type="submit" className="w-full md:w-auto" disabled={isSubmittingTeacher || isLoadingData}>{isSubmittingTeacher ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Add Teacher</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>User List ({schoolDetails?.schoolName || "Your School"})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search users..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingData || !schoolUsers.length}/>
              <Button variant="outline" size="icon" disabled={isLoadingData || !schoolUsers.length}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading users...</p></div>
          ) : filteredUsers.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Admission ID</TableHead><TableHead>Role</TableHead><TableHead>Class Assigned</TableHead><TableHead>Bus Route</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id?.toString()}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role === 'student' ? (user.admissionId || 'N/A') : 'N/A'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : user.role === 'student' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{getClassNameFromId(user.classId)}</TableCell>
                  <TableCell>{user.busRouteLocation ? `${user.busRouteLocation} (${user.busClassCategory || 'N/A'})` : 'N/A'}</TableCell>
                  <TableCell>{user.createdAt ? format(new Date(user.createdAt as string), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(user)} disabled={isSubmittingStudent || isSubmittingTeacher || isSubmittingEdit || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={userToDelete?._id === user._id} onOpenChange={(open) => !open && setUserToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(user)} disabled={isSubmittingStudent || isSubmittingTeacher || isSubmittingEdit || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {userToDelete && userToDelete._id === user._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>Delete <span className="font-semibold">{userToDelete.name} ({userToDelete.email})</span>?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
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
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No users match search." : "No teachers or students found."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

