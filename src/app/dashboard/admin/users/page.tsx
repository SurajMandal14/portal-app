
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, BookUser, Briefcase, XCircle, SquarePen } from "lucide-react";
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
  AlertDialogTrigger, // Added AlertDialogTrigger
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
import type { User as AppUser } from "@/types/user";
import type { School } from "@/types/school";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";

type SchoolUser = Partial<AppUser> & { className?: string };

export default function AdminUserManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
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


  const studentForm = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: { name: "", email: "", password: "", admissionId: "", classId: "" },
  });

  const teacherForm = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherFormSchema),
    defaultValues: { name: "", email: "", password: "", classId: "" },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { name: "", email: "", password: "", role: undefined, classId: "", admissionId: "" },
  });
  const editingUserRole = editForm.watch("role");


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
      const [schoolResult, usersResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString())
      ]);

      if (schoolResult.success && schoolResult.school) setSchoolDetails(schoolResult.school);
      else toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school." });

      if (usersResult.success && usersResult.users) {
        setSchoolUsers(usersResult.users.map(u => ({ ...u, className: u.classId || 'N/A', admissionId: u.admissionId })));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load users." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setSchoolUsers([]); setSchoolDetails(null); }
  }, [authUser, fetchInitialData]);

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name: editingUser.name || "",
        email: editingUser.email || "",
        password: "", 
        role: editingUser.role as 'teacher' | 'student' | undefined,
        classId: editingUser.classId === 'N/A' ? "" : editingUser.classId || "", 
        admissionId: editingUser.admissionId || "",
      });
    } else {
      editForm.reset({ name: "", email: "", password: "", role: undefined, classId: "", admissionId: "" });
    }
  }, [editingUser, editForm]);

  async function handleStudentSubmit(values: CreateStudentFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmittingStudent(true);
    const payload: CreateSchoolUserServerActionFormData = { ...values, role: 'student' };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmittingStudent(false);
    if (result.success) {
      toast({ title: "Student Created", description: result.message });
      studentForm.reset();
      fetchInitialData();
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }

  async function handleTeacherSubmit(values: CreateTeacherFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmittingTeacher(true);
    const payload: CreateSchoolUserServerActionFormData = { ...values, role: 'teacher' };
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
    const result = await updateSchoolUser(editingUser._id.toString(), authUser.schoolId.toString(), values);
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

  const availableClasses = schoolDetails?.classFees?.map(cf => cf.className).filter(Boolean) as string[] || [];

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
                      <FormField control={editForm.control} name="admissionId" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="flex items-center"><SquarePen className="mr-2 h-4 w-4"/>Admission ID</FormLabel>
                              <FormControl><Input {...field} disabled={isSubmittingEdit} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}/>
                   )}
                   {(editingUserRole === 'teacher' || editingUserRole === 'student') && availableClasses.length > 0 && (
                      <FormField control={editForm.control} name="classId" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Assign to Class</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmittingEdit}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                                  <SelectContent>{availableClasses.map((cn) => (<SelectItem key={cn} value={cn}>{cn}</SelectItem>))}</SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}/>
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
                        {availableClasses.length > 0 && <FormField control={studentForm.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Assign to Class (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmittingStudent}><FormControl><SelectTrigger><SelectValue placeholder="Select class"/></SelectTrigger></FormControl><SelectContent>{availableClasses.map((cn)=>(<SelectItem key={cn} value={cn}>{cn}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>}
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
                        {availableClasses.length > 0 && <FormField control={teacherForm.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Assign to Class (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmittingTeacher}><FormControl><SelectTrigger><SelectValue placeholder="Select class if class teacher"/></SelectTrigger></FormControl><SelectContent>{availableClasses.map((cn)=>(<SelectItem key={cn} value={cn}>{cn}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>}
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
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Admission ID</TableHead><TableHead>Role</TableHead><TableHead>Class Assigned</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
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
                  <TableCell>{user.className !== 'N/A' ? user.className : 'N/A'}</TableCell>
                  <TableCell>{user.createdAt ? format(new Date(user.createdAt), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(user)} disabled={isSubmittingStudent || isSubmittingTeacher || isSubmittingEdit || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog>
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

