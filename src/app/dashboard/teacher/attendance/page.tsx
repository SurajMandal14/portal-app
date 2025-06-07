
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, CalendarDays, Save, Loader2, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { submitAttendance } from "@/app/actions/attendance";
import { getStudentsByClass } from "@/app/actions/schoolUsers";
import type { AttendanceEntry, AttendanceStatus, AttendanceSubmissionPayload } from "@/types/attendance";
import type { AuthUser } from "@/types/user";

export default function TeacherAttendancePage() {
  const [attendanceDate, setAttendanceDate] = useState<Date | undefined>(undefined);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceEntry[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [assignedClassName, setAssignedClassName] = useState<string | null>(null);

  useEffect(() => {
    // Initialize date on client-side to prevent hydration mismatch
    setAttendanceDate(new Date());
  }, []); 

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            console.log("TeacherAttendancePage: (Effect 1) Parsed user from localStorage:", JSON.stringify(parsedUser, null, 2));

            if (parsedUser && parsedUser.role === 'teacher') {
                setAuthUser(parsedUser); 

                let className: string | null = null;
                if (parsedUser.classId && typeof parsedUser.classId === 'string') {
                    const trimmedClassId = parsedUser.classId.trim();
                    if (trimmedClassId !== "") {
                        className = trimmedClassId;
                        console.log("TeacherAttendancePage: (Effect 1) Successfully derived className:", className);
                    } else {
                        console.warn("TeacherAttendancePage: (Effect 1) parsedUser.classId is an empty string after trim. Raw:", parsedUser.classId);
                    }
                } else {
                     console.warn("TeacherAttendancePage: (Effect 1) parsedUser.classId is missing, not a string, or null. Raw:", parsedUser.classId);
                }
                setAssignedClassName(className);

            } else if (parsedUser && parsedUser.role !== 'teacher') {
                setAuthUser(null); 
                setAssignedClassName(null);
                toast({ variant: "destructive", title: "Access Denied", description: "You must be a teacher to mark attendance." });
            } else {
                // Parsed user is not as expected or role is missing
                setAuthUser(null); 
                setAssignedClassName(null);
                console.warn("TeacherAttendancePage: (Effect 1) Parsed user is invalid or role is not teacher.");
            }
        } catch(e) {
            console.error("TeacherAttendancePage: (Effect 1) Failed to parse user from localStorage:", e);
            setAuthUser(null);
            setAssignedClassName(null);
        }
    } else {
      console.log("TeacherAttendancePage: (Effect 1) No valid user in localStorage or storedUser is 'undefined'/'null'.");
      setAuthUser(null);
      setAssignedClassName(null);
    }
  }, [toast]); 

  const fetchStudents = useCallback(async () => {
    if (!authUser || !authUser.schoolId || !assignedClassName) {
      setStudentAttendance([]);
      setIsLoadingStudents(false);
      if (authUser && !assignedClassName) {
        console.log("TeacherAttendancePage: fetchStudents - authUser present but assignedClassName is missing or empty. authUser.classId from AuthUser object:", authUser.classId, "Current assignedClassName state:", assignedClassName);
      } else if (!authUser) {
        console.log("TeacherAttendancePage: fetchStudents - authUser is null.");
      } else if (authUser && !authUser.schoolId) {
        console.log("TeacherAttendancePage: fetchStudents - authUser.schoolId is missing.");
      }
      return;
    }
    console.log("TeacherAttendancePage: Fetching students for schoolId:", authUser.schoolId, "className:", assignedClassName);
    setIsLoadingStudents(true);
    const result = await getStudentsByClass(authUser.schoolId.toString(), assignedClassName);
    if (result.success && result.users) {
      const studentsForAttendance: AttendanceEntry[] = result.users.map(student => ({
        studentId: student._id!.toString(),
        studentName: student.name || 'Unknown Student',
        status: 'present' as AttendanceStatus, 
      }));
      setStudentAttendance(studentsForAttendance);
      if (studentsForAttendance.length === 0 && authUser.classId) {
        toast({ title: "No Students", description: `No students found in your assigned class: ${assignedClassName}. Please contact admin.` });
      }
    } else {
      toast({ variant: "destructive", title: "Error Loading Students", description: result.message || "Could not fetch students for the class." });
      setStudentAttendance([]);
    }
    setIsLoadingStudents(false);
  }, [authUser, assignedClassName, toast]);

  useEffect(() => {
    if (authUser && authUser.schoolId && assignedClassName) {
      fetchStudents();
    } else {
      setStudentAttendance([]); 
    }
  }, [authUser, assignedClassName, fetchStudents]);


  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(prev =>
      prev.map(s => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => ({...s, status })));
  }

  const handleSubmitAttendance = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id || !assignedClassName) { 
      toast({ variant: "destructive", title: "Error", description: "User or class information not found. Please log in again or contact admin if class is not assigned."});
      return;
    }
    if (!attendanceDate || studentAttendance.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a date and ensure students are listed."});
      return;
    }

    setIsSubmitting(true);

    const payload: AttendanceSubmissionPayload = {
      classId: assignedClassName, 
      className: assignedClassName, 
      schoolId: authUser.schoolId.toString(),
      date: attendanceDate,
      entries: studentAttendance,
      markedByTeacherId: authUser._id.toString(),
    };

    const result = await submitAttendance(payload);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Attendance Submitted", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error || result.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Mark Student Attendance
          </CardTitle>
          <CardDescription>
            {assignedClassName 
              ? `Marking attendance for class: ${assignedClassName}.`
              : "Please ensure you are assigned to a class to mark attendance."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
                {assignedClassName && <p className="font-semibold text-lg">Class: {assignedClassName}</p>}
                 <div>
                    <Label htmlFor="date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date-picker"
                            variant={"outline"}
                            className="w-full sm:w-[280px] justify-start text-left font-normal"
                            disabled={isSubmitting || !authUser || !assignedClassName || !attendanceDate}
                        >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {attendanceDate ? format(attendanceDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={attendanceDate}
                            onSelect={setAttendanceDate}
                            initialFocus
                            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
           {authUser && assignedClassName && studentAttendance.length > 0 && (
            <div className="flex gap-2 mt-4 md:mt-0 self-start md:self-center">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')} disabled={isSubmitting || isLoadingStudents}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')} disabled={isSubmitting || isLoadingStudents}>Mark All Absent</Button>
            </div>
           )}
        </CardHeader>
        <CardContent>
          {!authUser ? (
            <div className="text-center py-6">
                 <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">User Not Loaded</p>
                <p className="text-muted-foreground">Please try refreshing or logging in again.</p>
            </div>
          ) : !assignedClassName ? (
             <div className="text-center py-6">
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">Not Assigned to a Class</p>
                <p className="text-muted-foreground">You are not currently assigned to a class. Please contact your school administrator.</p>
                 <p className="text-xs text-muted-foreground mt-2">(Ensure you have logged out and back in if your class was recently assigned.)</p>
            </div>
          ) : isLoadingStudents ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading students for {assignedClassName}...</p>
            </div>
          ) : studentAttendance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentAttendance.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>{student.studentId.substring(0,8)}...</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={student.status === 'present'}
                        onCheckedChange={(checked) => checked && handleAttendanceChange(student.studentId, 'present')}
                        aria-label={`Mark ${student.studentName} present`}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={student.status === 'absent'}
                        onCheckedChange={(checked) => checked && handleAttendanceChange(student.studentId, 'absent')}
                        aria-label={`Mark ${student.studentName} absent`}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                     <TableCell className="text-center">
                      <Checkbox
                        checked={student.status === 'late'}
                        onCheckedChange={(checked) => checked && handleAttendanceChange(student.studentId, 'late')}
                        aria-label={`Mark ${student.studentName} late`}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No students found for your assigned class: {assignedClassName}. Please ensure students are assigned by the admin.
            </p>
          )}
           {authUser && assignedClassName && studentAttendance.length > 0 && (
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmitAttendance} disabled={isSubmitting || isLoadingStudents || !attendanceDate}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : <><Save className="mr-2 h-4 w-4" /> Submit Attendance</>}
                </Button>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

