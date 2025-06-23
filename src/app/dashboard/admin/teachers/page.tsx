
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, Briefcase, XCircle, UserMinus, UserCheck } from "lucide-react";
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
import { createSchoolUser, getSchoolUsers, updateSchoolUser, deleteSchoolUser, updateUserStatus } from "@/app/actions/schoolUsers";
import { 
    createTeacherFormSchema, type CreateTeacherFormData,
    updateSchoolUserFormSchema, type UpdateSchoolUserFormData,
    type CreateSchoolUserServerActionFormData
} from '@/types/user';
import { getSchoolById } from "@/app/actions/schools";
import { getSchoolClasses } from "@/app/actions/classes"; 
import type { User as AppUser } from "@/types/user";
import type { School } from "@/types/school";
import type { SchoolClass } from "@/types/classes"; 
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";

type SchoolTeacher = Partial<AppUser>; 

export default function AdminTeacherManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null); 
  const [managedClasses, setManagedClasses] = useState<SchoolClass[]>([]); 
  const [allSchoolTeachers, setAllSchoolTeachers] = useState<SchoolTeacher[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingTeacher, setEditingTeacher] = useState<SchoolTeacher | null>(null);
  const [userToUpdate, setUserToUpdate] = useState<SchoolTeacher | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isStatusUpdateLoading, setIsStatusUpdateLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const teacherForm = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", role: 'teacher',
        admissionId: undefined, enableBusTransport: false, busRouteLocation: undefined, busClassCategory: undefined,
        fatherName: undefined, motherName: undefined, dob: undefined, section: undefined, rollNo: undefined, examNo: undefined, aadharNo: undefined
    },
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
      const [schoolResult, usersResult, classesResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()),
        getSchoolClasses(authUser.schoolId.toString()) 
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
      }
      
      if (usersResult.success && usersResult.users) {
        setAllSchoolTeachers(usersResult.users.filter(u => u.role === 'teacher'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load teachers." });
        setAllSchoolTeachers([]);
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
    else { setIsLoadingData(false); setAllSchoolTeachers([]); setSchoolDetails(null); setManagedClasses([]); }
  }, [authUser, fetchInitialData]);

  useEffect(() => {
    if (isFormOpen && editingTeacher) {
      editForm.reset({
        name: editingTeacher.name || "",
        email: editingTeacher.email || "",
        password: "", 
        role: 'teacher',
      });
    }
  }, [editingTeacher, isFormOpen, editForm]);

  async function handleTeacherSubmit(values: CreateTeacherFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmitting(true);
    const payload: CreateSchoolUserServerActionFormData = { ...values, role: 'teacher' };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Teacher Created", description: result.message });
      teacherForm.reset();
      setIsFormOpen(false);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  async function handleEditSubmit(values: UpdateSchoolUserFormData) {
    if (!authUser?.schoolId || !editingTeacher?._id) return;
    setIsSubmitting(true);
    const payload = { ...values, role: 'teacher' as 'teacher' };
    const result = await updateSchoolUser(editingTeacher._id.toString(), authUser.schoolId.toString(), payload);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Teacher Updated", description: result.message });
      setEditingTeacher(null);
      setIsFormOpen(false);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (teacher: SchoolTeacher) => { 
    setEditingTeacher(teacher);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const handleAddClick = () => {
    setEditingTeacher(null);
    teacherForm.reset();
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelClick = () => {
    setIsFormOpen(false);
    setEditingTeacher(null);
  };
  
  const handleActionClick = (user: SchoolTeacher) => {
    setUserToUpdate(user);
    setIsActionDialogOpen(true);
  };

  const handleDiscontinue = async () => {
    if (!userToUpdate?._id || !authUser?.schoolId) return;
    setIsStatusUpdateLoading(true);
    const result = await updateUserStatus(userToUpdate._id.toString(), authUser.schoolId.toString(), 'discontinued');
    if (result.success) {
      toast({ title: "Status Updated", description: result.message });
      fetchInitialData();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
    setIsStatusUpdateLoading(false);
    setIsActionDialogOpen(false);
    setUserToUpdate(null);
  };

  const handleReactivate = async () => {
    if (!userToUpdate?._id || !authUser?.schoolId) return;
    setIsStatusUpdateLoading(true);
    const result = await updateUserStatus(userToUpdate._id.toString(), authUser.schoolId.toString(), 'active');
    if (result.success) {
      toast({ title: "Status Updated", description: result.message });
      fetchInitialData();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
    setIsStatusUpdateLoading(false);
    setIsActionDialogOpen(false);
    setUserToUpdate(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!userToUpdate?._id || !authUser?.schoolId) return;
    setIsStatusUpdateLoading(true);
    const result = await deleteSchoolUser(userToUpdate._id.toString(), authUser.schoolId.toString());
    if (result.success) {
      toast({ title: "Teacher Deleted", description: result.message });
      fetchInitialData();
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setIsStatusUpdateLoading(false);
    setIsConfirmDeleteDialogOpen(false);
    setUserToUpdate(null);
  };

  const filteredTeachers = allSchoolTeachers.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getClassNameFromId = (teacherId: string | undefined): string => {
    if (!teacherId) return 'N/A';
    const foundClass = managedClasses.find(cls => cls.classTeacherId === teacherId);
    return foundClass ? `${foundClass.name} - ${foundClass.section}` : 'N/A';
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
          <CardTitle className="text-2xl font-headline flex items-center"><Briefcase className="mr-2 h-6 w-6" /> Teacher Management</CardTitle>
          <CardDescription>Manage teacher accounts for {schoolDetails?.schoolName || "your school"}.</CardDescription>
        </CardHeader>
      </Card>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {editingTeacher ? <><Edit3 className="mr-2 h-5 w-5"/>Edit Teacher: {editingTeacher.name}</> : <><UserPlus className="mr-2 h-5 w-5"/>Add New Teacher</>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingTeacher ? (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={editForm.control} name="password" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Leave blank to keep current password.</FormDescription><FormMessage /></FormItem>)}/>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting || isLoadingData}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}Update Teacher</Button>
                    <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...teacherForm}>
                <form onSubmit={teacherForm.handleSubmit(handleTeacherSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={teacherForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Teacher" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={teacherForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="teacher@example.com" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={teacherForm.control} name="password" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoadingData}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Add Teacher</Button>
                    <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Teacher List ({schoolDetails?.schoolName || "Your School"})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search teachers..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingData || !allSchoolTeachers.length}/>
              <Button onClick={handleAddClick} disabled={isFormOpen && !editingTeacher}><UserPlus className="mr-2 h-4 w-4"/>Add New Teacher</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading teachers...</p></div>
          ) : filteredTeachers.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Class Teacher For</TableHead><TableHead>Status</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher._id?.toString()} className={teacher.status === 'discontinued' ? 'opacity-50' : ''}>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{getClassNameFromId(teacher._id)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        teacher.status === 'active' ? 'bg-green-100 text-green-800 border border-green-300' :
                        'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}>
                        {teacher.status || 'active'}
                    </span>
                  </TableCell>
                  <TableCell>{teacher.createdAt ? format(new Date(teacher.createdAt as string), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(teacher)} disabled={isSubmitting || isStatusUpdateLoading}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleActionClick(teacher)} disabled={isSubmitting || isStatusUpdateLoading}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No teachers match search." : "No teachers found for this school."}</p>
          )}
        </CardContent>
      </Card>
      
      {/* Action Dialog */}
      <AlertDialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToUpdate?.status === 'discontinued'
                ? `Reactivate ${userToUpdate?.name}?`
                : `Update status for ${userToUpdate?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToUpdate?.status === 'discontinued'
                ? "This will set the user's status back to 'active', allowing them to log in and use the system again."
                : "You can mark the user as 'Discontinued' to deactivate their account while preserving records. Or, 'Delete Permanently' to remove all data, which cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToUpdate(null)}>Cancel</AlertDialogCancel>
            {userToUpdate?.status === 'discontinued' ? (
              <Button variant="outline" onClick={handleReactivate} disabled={isStatusUpdateLoading}>
                {isStatusUpdateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCheck className="mr-2 h-4 w-4"/>} Reactivate
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDiscontinue} disabled={isStatusUpdateLoading}>
                {isStatusUpdateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserMinus className="mr-2 h-4 w-4"/>} Discontinue
              </Button>
            )}
            <Button variant="destructive" onClick={() => { setIsActionDialogOpen(false); setIsConfirmDeleteDialogOpen(true); }} disabled={isStatusUpdateLoading}>
              <Trash2 className="mr-2 h-4 w-4"/> Delete Permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Permanent Deletion Dialog */}
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {userToUpdate?.name}. All associated data will be lost. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToUpdate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isStatusUpdateLoading} className="bg-destructive hover:bg-destructive/90">
              {isStatusUpdateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
