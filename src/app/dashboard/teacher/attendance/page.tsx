"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, CalendarDays, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";


// Mock data
const mockClasses = [
  { id: "C001", name: "Grade 10A" },
  { id: "C002", name: "Grade 10B" },
  { id: "C003", name: "Grade 9A" },
];

const mockStudentsByClass: { [key: string]: { id: string, name: string, status?: 'present' | 'absent' | 'late' }[] } = {
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
  const [studentAttendance, setStudentAttendance] = useState<{ id: string, name: string, status?: 'present' | 'absent' | 'late' }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClassId) {
      setStudentAttendance(mockStudentsByClass[selectedClassId]?.map(s => ({...s, status: 'present'})) || []); // Default all to present
    } else {
      setStudentAttendance([]);
    }
  }, [selectedClassId]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setStudentAttendance(prev =>
      prev.map(s => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    setStudentAttendance(prev => prev.map(s => ({...s, status })));
  }

  const handleSubmitAttendance = () => {
    if (!selectedClassId || !attendanceDate || studentAttendance.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a class, date, and mark attendance."});
      return;
    }
    // TODO: Implement actual attendance submission logic
    console.log("Submitting attendance:", { classId: selectedClassId, date: attendanceDate, records: studentAttendance });
    toast({ title: "Attendance Submitted", description: `Attendance for ${mockClasses.find(c=>c.id===selectedClassId)?.name} on ${format(attendanceDate, "PPP")} submitted.` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Mark Student Attendance
          </CardTitle>
          <CardDescription>Select a class and date to mark attendance.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            <div>
              <Label htmlFor="class-select" className="mb-1 block">Select Class</Label>
              <Select onValueChange={setSelectedClassId} value={selectedClassId || ""}>
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
           {selectedClassId && studentAttendance.length > 0 && (
            <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')}>Mark All Absent</Button>
            </div>
           )}
        </CardHeader>
        <CardContent>
          {selectedClassId && studentAttendance.length > 0 ? (
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
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={student.status === 'present'}
                        onCheckedChange={(checked) => checked && handleAttendanceChange(student.id, 'present')}
                        aria-label={`Mark ${student.name} present`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={student.status === 'absent'}
                        onCheckedChange={(checked) => checked && handleAttendanceChange(student.id, 'absent')}
                        aria-label={`Mark ${student.name} absent`}
                      />
                    </TableCell>
                     <TableCell className="text-center">
                      <Checkbox
                        checked={student.status === 'late'}
                        onCheckedChange={(checked) => checked && handleAttendanceChange(student.id, 'late')}
                        aria-label={`Mark ${student.name} late`}
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
           {selectedClassId && studentAttendance.length > 0 && (
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSubmitAttendance}><Save className="mr-2 h-4 w-4" /> Submit Attendance</Button>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
