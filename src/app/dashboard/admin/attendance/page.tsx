
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, CalendarDays, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getDailyAttendanceForSchool } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance"; // Assuming AuthUser is also in attendance types or a central one

export default function AdminAttendancePage() {
  const [attendanceDate, setAttendanceDate] = useState<Date | undefined>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [filterClass, setFilterClass] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role && parsedUser.schoolId) {
                 setAuthUser(parsedUser);
            } else {
                setAuthUser(null);
                 toast({ variant: "destructive", title: "Error", description: "School admin information not found. Please log in again." });
            }
        } catch(e) {
            console.error("Failed to parse user from localStorage in AdminAttendancePage:", e);
            setAuthUser(null);
        }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const fetchAttendance = useCallback(async () => {
    if (!authUser || !authUser.schoolId || !attendanceDate) {
      if (authUser && !attendanceDate) toast({ variant: "destructive", title: "Error", description: "Please select a date to view attendance." });
      setAttendanceRecords([]); // Clear records if no authUser or date
      return;
    }
    setIsLoading(true);
    const result = await getDailyAttendanceForSchool(authUser.schoolId.toString(), attendanceDate);
    setIsLoading(false);
    if (result.success && result.records) {
      setAttendanceRecords(result.records);
    } else {
      toast({ variant: "destructive", title: "Failed to load attendance", description: result.error || "Could not fetch attendance data." });
      setAttendanceRecords([]);
    }
  }, [authUser, attendanceDate, toast]);

  useEffect(() => {
    if (authUser && authUser.schoolId && attendanceDate) {
      fetchAttendance();
    } else {
        setAttendanceRecords([]); // Clear if no authUser or date
    }
  }, [authUser, attendanceDate, fetchAttendance]);

  const filteredRecords = filterClass
    ? attendanceRecords.filter(record => record.className.toLowerCase().includes(filterClass.toLowerCase()))
    : attendanceRecords;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Student Attendance Overview
          </CardTitle>
          <CardDescription>View student attendance records for your school. Select a date to load records.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <CardTitle>Daily Attendance Records</CardTitle>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-auto">
                        <Label htmlFor="date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date-picker"
                                variant={"outline"}
                                className="w-full sm:w-[280px] justify-start text-left font-normal"
                                disabled={isLoading || !authUser}
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
                    <div className="w-full sm:w-auto">
                         <Label htmlFor="filter-class" className="mb-1 block text-sm font-medium">Filter by Class</Label>
                        <Input 
                            id="filter-class"
                            placeholder="Filter class..." 
                            className="w-full sm:w-auto" 
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            disabled={isLoading || !authUser}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchAttendance} disabled={isLoading || !authUser}><Filter className="h-4 w-4"/></Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading attendance records...</p>
            </div>
          ) : !authUser ? (
             <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view attendance.</p>
          ) : !attendanceDate ? (
             <p className="text-center text-muted-foreground py-4">Please select a date to view records.</p>
          ) : filteredRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked By (Teacher ID)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record._id.toString()}>
                    <TableCell>{record.studentName}</TableCell>
                    <TableCell>{record.className}</TableCell>
                    <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                            record.status === 'present' ? 'bg-green-100 text-green-700' :
                            record.status === 'absent' ? 'bg-red-100 text-red-700' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-700' : ''
                        }`}>
                            {record.status}
                        </span>
                    </TableCell>
                    <TableCell>{record.markedByTeacherId.toString().substring(0, 8)}...</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No attendance data available for the selected date and filter.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
