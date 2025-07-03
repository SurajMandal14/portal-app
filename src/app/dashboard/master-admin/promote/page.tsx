
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Construction, ArrowRight, Loader2, Info, Users, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { School } from "@/types/school";
import type { User as AppUser } from "@/types/user";
import { getSchools } from "@/app/actions/schools";
import { getClassesForSchoolAsOptions } from "@/app/actions/classes";
import { getStudentsByClass } from "@/app/actions/schoolUsers";

interface ClassOption {
  value: string;
  label: string;
}

export default function MasterAdminPromoteStudentsPage() {
    const { toast } = useToast();
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [classesInSchool, setClassesInSchool] = useState<ClassOption[]>([]);
    
    const [fromAcademicYear, setFromAcademicYear] = useState(`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`);
    const [toAcademicYear, setToAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

    const [fromClassId, setFromClassId] = useState("");
    const [toClassId, setToClassId] = useState("");

    const [students, setStudents] = useState<AppUser[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});

    const [isLoadingSchools, setIsLoadingSchools] = useState(true);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);

    useEffect(() => {
        async function loadSchools() {
            setIsLoadingSchools(true);
            const result = await getSchools();
            if(result.success && result.schools) {
                setSchools(result.schools);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load schools.' });
            }
            setIsLoadingSchools(false);
        }
        loadSchools();
    }, [toast]);

    const handleSchoolChange = useCallback(async (schoolId: string) => {
        setSelectedSchoolId(schoolId);
        setFromClassId("");
        setToClassId("");
        setStudents([]);
        setSelectedStudents({});
        setIsLoadingClasses(true);
        const classOptions = await getClassesForSchoolAsOptions(schoolId);
        setClassesInSchool(classOptions);
        setIsLoadingClasses(false);
    }, []);

    const handleLoadStudents = useCallback(async () => {
        if (!fromClassId) {
            toast({ variant: 'warning', title: 'Selection Missing', description: 'Please select a "From" class.' });
            return;
        }
        setIsLoadingStudents(true);
        const result = await getStudentsByClass(selectedSchoolId, fromClassId);
        if (result.success && result.users) {
            setStudents(result.users);
            const initialSelections: Record<string, boolean> = {};
            result.users.forEach(s => {
                if(s._id) initialSelections[s._id.toString()] = true; // Default to all selected
            });
            setSelectedStudents(initialSelections);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load students for the selected class.' });
            setStudents([]);
        }
        setIsLoadingStudents(false);
    }, [fromClassId, selectedSchoolId, toast]);

    const handlePromote = () => {
        setIsPromoting(true);
        // Placeholder for promotion logic
        console.log("Promoting students...", {
            fromClassId,
            toClassId,
            fromAcademicYear,
            toAcademicYear,
            selectedStudents
        });
        toast({ title: "Action Not Implemented", description: "Student promotion logic is not yet connected."});
        setTimeout(() => setIsPromoting(false), 1000);
    };

    const handleSelectAll = (checked: boolean) => {
        const newSelections: Record<string, boolean> = {};
        students.forEach(s => {
            if(s._id) newSelections[s._id.toString()] = checked;
        });
        setSelectedStudents(newSelections);
    };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <GraduationCap className="mr-2 h-6 w-6" /> Student Promotion Module
          </CardTitle>
          <CardDescription>
            Promote students to the next class and manage academic year transitions.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Promotion Setup</CardTitle>
              <CardDescription>Select the school, classes, and academic years for the promotion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                      <Label>School</Label>
                      <Select onValueChange={handleSchoolChange} value={selectedSchoolId} disabled={isLoadingSchools}>
                          <SelectTrigger><SelectValue placeholder="Select a school"/></SelectTrigger>
                          <SelectContent>{schools.map(s => <SelectItem key={s._id} value={s._id}>{s.schoolName}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div>
                      <Label>From Academic Year</Label>
                      <Input value={fromAcademicYear} onChange={e => setFromAcademicYear(e.target.value)} placeholder="YYYY-YYYY"/>
                  </div>
                  <div>
                      <Label>To Academic Year</Label>
                      <Input value={toAcademicYear} onChange={e => setToAcademicYear(e.target.value)} placeholder="YYYY-YYYY"/>
                  </div>
                  <div>
                      <Label>From Class</Label>
                      <Select onValueChange={setFromClassId} value={fromClassId} disabled={isLoadingClasses || !selectedSchoolId}>
                          <SelectTrigger><SelectValue placeholder="Select 'from' class"/></SelectTrigger>
                          <SelectContent>{classesInSchool.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div>
                      <Label>To Class</Label>
                       <Select onValueChange={setToClassId} value={toClassId} disabled={isLoadingClasses || !selectedSchoolId}>
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
                <CardDescription>Select students to promote. Unselected students can be marked as discontinued.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={students.every(s => s._id && selectedStudents[s._id.toString()])} /></TableHead>
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
                 <div className="flex justify-end gap-2 mt-4">
                    <Button variant="destructive" onClick={handlePromote} disabled={isPromoting}>
                        {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserX className="mr-2 h-4 w-4"/>} Discontinue Unselected
                    </Button>
                    <Button onClick={handlePromote} disabled={isPromoting || !toClassId}>
                        {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCheck className="mr-2 h-4 w-4"/>} Promote Selected
                    </Button>
                </div>
                {!toClassId && <p className="text-destructive text-sm text-right mt-2">Please select a "To" class to enable promotion.</p>}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
