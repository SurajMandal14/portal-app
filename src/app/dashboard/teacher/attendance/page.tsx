
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, CalendarDays, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { submitAttendance } from "@/app/actions/attendance";
import type { AttendanceEntry, AttendanceStatus, AuthUser, AttendanceSubmissionPayload } from "@/types/attendance";


// Mock data
const mockClasses = [
  { id: "C001", name: "Grade 10A" },
  { id: "C002", name: "Grade 10B" },
  { id: "C003", name: "Grade 9A" },
];

const mockStudentsByClass: { [key: string]: { id: string, name: string, status?: AttendanceStatus }[] } = {
  "C001": [
    { id: "S001", name: "Alice Smith" }, { id: "S002", name: "Bob Johnson" }, { id: "S003", name: "Charlie Brown" },
    { id: "S004", name: "Diana Prince" }, { id: "S005", name: "Edward Nygma" },
  ],
  "C002": [
    { id: "S006", name: "Fiona Gallagher" }, { id: "S007", name: "George Jetson" },
  ],
  "C003": [
    { id: "S008", name: "Harry Potter" }, { id: "S009", name: "Hermione Granger" }, { id: "S010", name: "Ron Weasley" },
  ],
};


export default function TeacherAttendancePage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<Date | undefined>(new Date());
  const [studentAttendance, setStudentAttendance] = useState<AttendanceEntry[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role) {
                 setAuthUser(parsedUser);
            } else {
                setAuthUser(null); // Invalid user object
            }
        } catch(e) {
            console.error("Failed to parse user from localStorage in TeacherAttendancePage:", e);
            setAuthUser(null);
        }
    } else {
      setAuthUser(null);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      setStudentAttendance(mockStudentsByClass[selectedClassId]?.map(s => ({studentId: s.id, studentName: s.name, status: 'present'} as AttendanceEntry)) || []); 
    } else {
      setStudentAttendance([]);
    }
  }, [selectedClassId]);

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(prev =>
      prev.map(s => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => ({...s, status })));
  }

  const handleSubmitAttendance = async () => {
    if (!selectedClassId || !attendanceDate || studentAttendance.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a class, date, and ensure students are listed."});
      return;
    }
    if (!authUser || !authUser.schoolId || !authUser._id) {
      toast({ variant: "destructive", title: "Error", description: "User information not found. Please log in again."});
      return;
    }
    
    const selectedClassName = mockClasses.find(c => c.id === selectedClassId)?.name;
    if (!selectedClassName) {
      toast({ variant: "destructive", title: "Error", description: "Selected class name not found."});
      return;
    }

    setIsSubmitting(true);

    const payload: AttendanceSubmissionPayload = {
      classId: selectedClassId,
      className: selectedClassName,
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
          <CardDescription>Select a class and date to mark attendance. Ensure you are logged in.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            <div>
              <Label htmlFor="class-select" className="mb-1 block">Select Class</Label>
              <Select onValueChange={setSelectedClassId} value={selectedClassId || ""} disabled={isSubmitting || !authUser}>
                <SelectTrigger id="class-select" className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {mockClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-picker" className="mb-1 block">Select Date</Label>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker"
                    variant={"outline"}
                    className="w-full sm:w-[280px] justify-start text-left font-normal"
                    disabled={isSubmitting || !authUser}
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
           {selectedClassId && studentAttendance.length > 0 && authUser && (
            <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')} disabled={isSubmitting}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')} disabled={isSubmitting}>Mark All Absent</Button>
            </div>
           )}
        </CardHeader>
        <CardContent>
          {!authUser ? (
            <p className="text-center text-destructive py-4">User information not loaded. Please try refreshing or logging in again.</p>
          ) : selectedClassId && studentAttendance.length > 0 ? (
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
                    <TableCell>{student.studentId}</TableCell>
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
              {selectedClassId ? "No students found for this class." : "Please select a class to view students."}
            </p>
          )}
           {selectedClassId && studentAttendance.length > 0 && authUser && (
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmitAttendance} disabled={isSubmitting}>
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
