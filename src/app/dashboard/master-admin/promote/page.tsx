
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowRight, Loader2, Info, Users, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { School } from "@/types/school";
import type { User as AppUser, AuthUser } from "@/types/user";
import { getClassesForSchoolAsOptions } from "@/app/actions/classes";
import { getStudentsByClass } from "@/app/actions/schoolUsers";
import { promoteStudents, discontinueStudents } from "@/app/actions/promoteStudents"; 

interface ClassOption {
  value: string;
  label: string;
}

export default function MasterAdminPromoteStudentsPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [classesInSchool, setClassesInSchool] = useState<ClassOption[]>([]);
    
    const [fromAcademicYear, setFromAcademicYear] = useState(`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`);
    const [toAcademicYear, setToAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

    const [fromClassId, setFromClassId] = useState("");
    const [toClassId, setToClassId] = useState("");

    const [students, setStudents] = useState<AppUser[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});

    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);
    const [isDiscontinuing, setIsDiscontinuing] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser && storedUser !== 'undefined') {
            try {
                const parsedUser: AuthUser = JSON.parse(storedUser);
                if (parsedUser.role === 'masteradmin' && parsedUser.schoolId) {
                    setAuthUser(parsedUser);
                }
            } catch (e) { console.error(e); }
        }
    }, []);

    const fetchClasses = useCallback(async (schoolId: string) => {
        setIsLoadingClasses(true);
        const classOptions = await getClassesForSchoolAsOptions(schoolId);
        setClassesInSchool(classOptions);
        setIsLoadingClasses(false);
    }, []);

    useEffect(() => {
        if (authUser?.schoolId) {
            fetchClasses(authUser.schoolId.toString());
        }
    }, [authUser, fetchClasses]);


    const handleLoadStudents = useCallback(async () => {
        if (!fromClassId || !authUser?.schoolId) {
            toast({ variant: 'warning', title: 'Selection Missing', description: 'Please select a "From" class.' });
            return;
        }
        setIsLoadingStudents(true);
        const result = await getStudentsByClass(authUser.schoolId.toString(), fromClassId);
        if (result.success && result.users) {
            const activeStudents = result.users.filter(u => u.status !== 'discontinued');
            setStudents(activeStudents);
            const initialSelections: Record<string, boolean> = {};
            activeStudents.forEach(s => {
                if(s._id) initialSelections[s._id.toString()] = true; // Default to all selected
            });
            setSelectedStudents(initialSelections);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load students for the selected class.' });
            setStudents([]);
        }
        setIsLoadingStudents(false);
    }, [fromClassId, authUser, toast]);

    const { selectedIds, unselectedIds } = useMemo(() => {
        const studentIds = students.map(s => s._id!.toString());
        const selected = studentIds.filter(id => selectedStudents[id]);
        const unselected = studentIds.filter(id => !selectedStudents[id]);
        return { selectedIds: selected, unselectedIds: unselected };
    }, [students, selectedStudents]);


    const handlePromote = async () => {
        if (selectedIds.length === 0 || !authUser?.schoolId) {
            toast({ variant: "info", title: "No students selected", description: "Please select students to promote."});
            return;
        }
        if (!toClassId) {
            toast({ variant: "destructive", title: "Destination class not selected", description: "Please select a 'To' class."});
            return;
        }
        setIsPromoting(true);
        const result = await promoteStudents({
            schoolId: authUser.schoolId.toString(),
            toClassId: toClassId,
            studentIds: selectedIds,
            academicYear: toAcademicYear,
        });

        if (result.success) {
            toast({ title: "Promotion Successful", description: result.message });
            handleLoadStudents();
        } else {
            toast({ variant: "destructive", title: "Promotion Failed", description: result.error || result.message });
        }
        setIsPromoting(false);
    };

    const handleDiscontinue = async () => {
        if (unselectedIds.length === 0 || !authUser?.schoolId) {
            toast({ variant: "info", title: "No students to discontinue", description: "All students are selected for promotion."});
            return;
        }
        setIsDiscontinuing(true);
        const result = await discontinueStudents({
            schoolId: authUser.schoolId.toString(),
            studentIds: unselectedIds,
        });
        if (result.success) {
            toast({ title: "Update Successful", description: result.message });
            handleLoadStudents();
        } else {
             toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
        }
        setIsDiscontinuing(false);
    };

    const handleSelectAll = (checked: boolean) => {
        const newSelections: Record<string, boolean> = {};
        students.forEach(s => {
            if(s._id) newSelections[s._id.toString()] = checked;
        });
        setSelectedStudents(newSelections);
    };

    const allSelected = useMemo(() => students.length > 0 && selectedIds.length === students.length, [students, selectedIds]);

    if (!authUser) {
      return (
        <Card>
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please log in as a Master Admin.</p></CardContent>
        </Card>
      );
    }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <GraduationCap className="mr-2 h-6 w-6" /> Student Promotion Module
          </CardTitle>
          <CardDescription>
            Promote students to the next class and manage academic year transitions for your assigned school.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Promotion Setup</CardTitle>
              <CardDescription>Select the classes and academic years for the promotion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   <div>
                      <Label>From Academic Year</Label>
                      <Input value={fromAcademicYear} onChange={e => setFromAcademicYear(e.target.value)} placeholder="YYYY-YYYY"/>
                  </div>
                  <div>
                      <Label>To Academic Year</Label>
                      <Input value={toAcademicYear} onChange={e => setToAcademicYear(e.target.value)} placeholder="YYYY-YYYY"/>
                  </div>
                  <div/>
                  <div>
                      <Label>From Class</Label>
                      <Select onValueChange={setFromClassId} value={fromClassId} disabled={isLoadingClasses}>
                          <SelectTrigger><SelectValue placeholder="Select 'from' class"/></SelectTrigger>
                          <SelectContent>{classesInSchool.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div>
                      <Label>To Class</Label>
                       <Select onValueChange={setToClassId} value={toClassId} disabled={isLoadingClasses}>
                          <SelectTrigger><SelectValue placeholder="Select 'to' class"/></SelectTrigger>
                          <SelectContent>{classesInSchool.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <div className="self-end">
                    <Button onClick={handleLoadStudents} disabled={!fromClassId || isLoadingStudents} className="w-full">
                        {isLoadingStudents ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Users className="mr-2 h-4 w-4"/>} Load Students
                    </Button>
                  </div>
              </div>
          </CardContent>
      </Card>

      {students.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Students for Promotion</CardTitle>
                <CardDescription>
                    Select students to promote from "{classesInSchool.find(c => c.value === fromClassId)?.label}" to "{classesInSchool.find(c => c.value === toClassId)?.label || '...'}" for the {toAcademicYear} academic year.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => handleSelectAll(!!checked)} checked={allSelected} /></TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Admission ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map(student => (
                            <TableRow key={student._id}>
                                <TableCell><Checkbox checked={!!selectedStudents[student._id!.toString()]} onCheckedChange={(checked) => setSelectedStudents(prev => ({...prev, [student._id!.toString()]: !!checked}))}/></TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.admissionId}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-muted-foreground">
                        {selectedIds.length} of {students.length} student(s) selected.
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDiscontinue} disabled={isDiscontinuing || unselectedIds.length === 0}>
                            {isDiscontinuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserX className="mr-2 h-4 w-4"/>} Discontinue Unselected ({unselectedIds.length})
                        </Button>
                        <Button onClick={handlePromote} disabled={isPromoting || !toClassId || selectedIds.length === 0}>
                            {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCheck className="mr-2 h-4 w-4"/>} Promote Selected ({selectedIds.length})
                        </Button>
                    </div>
                </div>
                {!toClassId && <p className="text-destructive text-sm text-right mt-2">Please select a "To" class to enable promotion.</p>}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
