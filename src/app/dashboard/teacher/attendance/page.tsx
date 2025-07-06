
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, ChevronLeft, ChevronRight, Save, Loader2, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isToday } from "date-fns";
import { submitAttendance } from "@/app/actions/attendance";
import { getStudentsByClass } from "@/app/actions/schoolUsers";
import { getClassDetailsById } from "@/app/actions/classes"; 
import type { AttendanceEntry, AttendanceStatus, AttendanceSubmissionPayload } from "@/types/attendance";
import type { AuthUser } from "@/types/user";
import type { SchoolClass } from "@/types/classes";
import { cn } from "@/lib/utils";

const DayCell = ({ day, selectedDate, onDateSelect, isToday: dayIsTodayFlag }: { day: Date; selectedDate: Date; onDateSelect: (date: Date) => void; isToday: boolean }) => {
  return (
    <button
      type="button"
      onClick={() => onDateSelect(day)}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
        isSameDay(day, selectedDate) && "bg-primary text-primary-foreground",
        !isSameDay(day, selectedDate) && dayIsTodayFlag && "bg-accent text-accent-foreground",
        !isSameDay(day, selectedDate) && !dayIsTodayFlag && "hover:bg-muted"
      )}
    >
      {format(day, 'd')}
    </button>
  );
};


export default function TeacherAttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [studentAttendance, setStudentAttendance] = useState<AttendanceEntry[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [assignedClassDetails, setAssignedClassDetails] = useState<SchoolClass | null>(null);
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));


  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role === 'teacher') {
                setAuthUser(parsedUser); 
            } else {
                setAuthUser(null);
            }
        } catch(e) {
            setAuthUser(null);
        }
    } else {
      setAuthUser(null);
    }
  }, []); 

  const fetchClassDetailsAndStudents = useCallback(async () => {
    if (!authUser || !authUser.schoolId || !authUser.classId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const classResult = await getClassDetailsById(authUser.classId, authUser.schoolId.toString());

    if (classResult.success && classResult.classDetails) {
      setAssignedClassDetails(classResult.classDetails);
      const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), classResult.classDetails._id); 
      if (studentsResult.success && studentsResult.users) {
        const studentsForAttendance: AttendanceEntry[] = studentsResult.users.map(student => ({
          studentId: student._id!.toString(),
          studentName: student.name || 'Unknown Student',
          status: 'present' as AttendanceStatus, 
        }));
        setStudentAttendance(studentsForAttendance);
      } else {
        toast({ variant: "destructive", title: "Error Loading Students", description: studentsResult.message });
      }
    } else {
      toast({ variant: "destructive", title: "Class Not Found", description: `Your assigned class could not be found.` });
    }
    setIsLoading(false);
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.classId) {
      fetchClassDetailsAndStudents();
    } else {
        setIsLoading(false);
    }
  }, [authUser, fetchClassDetailsAndStudents]);


  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => ({...s, status })));
  };

  const handleSubmitAttendance = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id || !assignedClassDetails) { 
      toast({ variant: "destructive", title: "Error", description: "User or class information not found."});
      return;
    }
    if (studentAttendance.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No students to submit attendance for."});
      return;
    }

    setIsSubmitting(true);
    const payload: AttendanceSubmissionPayload = {
      classId: assignedClassDetails._id,
      className: `${assignedClassDetails.name}${assignedClassDetails.section ? ` - ${assignedClassDetails.section}` : ''}`, 
      schoolId: authUser.schoolId.toString(),
      date: selectedDate,
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

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading your class details...</p></div>;
  }
  
  if (!authUser) {
     return <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please log in as a teacher.</p></CardContent></Card>;
  }
  
  if (!assignedClassDetails) {
     return (
        <Card className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardHeader><CardTitle>Not Assigned to a Class</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You are not currently assigned to a class. Please contact your school administrator.</p>
            </CardContent>
        </Card>
     );
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Monthly Attendance
          </CardTitle>
          <CardDescription>
            Select a day from the calendar to mark attendance for class: <span className="font-semibold">{`${assignedClassDetails.name}${assignedClassDetails.section ? ` - ${assignedClassDetails.section}` : ''}`}</span>.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
              {weekdays.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
              {monthDays.map(day => <DayCell key={day.toString()} day={day} selectedDate={selectedDate} onDateSelect={setSelectedDate} isToday={isToday(day)} />)}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <CardTitle>Mark Attendance for: {format(selectedDate, "PPP")}</CardTitle>
                        <CardDescription>Class: {`${assignedClassDetails.name}${assignedClassDetails.section ? ` - ${assignedClassDetails.section}` : ''}`}</CardDescription>
                    </div>
                     <div className="flex gap-2 mt-2 sm:mt-0">
                        <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')} disabled={isSubmitting || studentAttendance.length === 0}>All Present</Button>
                        <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')} disabled={isSubmitting || studentAttendance.length === 0}>All Absent</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {studentAttendance.length > 0 ? (
                <>
                    <Table>
                    <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead className="text-center">Present</TableHead><TableHead className="text-center">Absent</TableHead><TableHead className="text-center">Late</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {studentAttendance.map((student) => (
                        <TableRow key={student.studentId}>
                            <TableCell>{student.studentName}</TableCell>
                            <TableCell className="text-center"><input type="radio" name={`attendance-${student.studentId}`} checked={student.status === 'present'} onChange={() => handleAttendanceChange(student.studentId, 'present')} disabled={isSubmitting} className="h-4 w-4" /></TableCell>
                            <TableCell className="text-center"><input type="radio" name={`attendance-${student.studentId}`} checked={student.status === 'absent'} onChange={() => handleAttendanceChange(student.studentId, 'absent')} disabled={isSubmitting} className="h-4 w-4" /></TableCell>
                            <TableCell className="text-center"><input type="radio" name={`attendance-${student.studentId}`} checked={student.status === 'late'} onChange={() => handleAttendanceChange(student.studentId, 'late')} disabled={isSubmitting} className="h-4 w-4" /></TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSubmitAttendance} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Submit for {format(selectedDate, "do MMM")}
                        </Button>
                    </div>
                </>
                ) : (
                <p className="text-center text-muted-foreground py-4">No students found in your assigned class.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
