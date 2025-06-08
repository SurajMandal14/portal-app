
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChartBig, CalendarDays, Loader2, Info } from "lucide-react"; // Removed Filter icon for now
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getDailyAttendanceForSchool } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";
import { getSchoolUsers } from "@/app/actions/schoolUsers";
import type { User as AppUser } from "@/types/user";

interface ClassAttendanceSummary {
  className: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
}

interface OverallAttendanceSummary {
    totalStudents: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    overallAttendancePercentage: number;
}

export default function AdminReportsPage() {
  const [reportDate, setReportDate] = useState<Date | undefined>(undefined);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassAttendanceSummary[]>([]);
  const [overallSummary, setOverallSummary] = useState<OverallAttendanceSummary | null>(null);
  const [allSchoolStudents, setAllSchoolStudents] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Initialize date on client-side
    setReportDate(new Date()); 

    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
                 setAuthUser(parsedUser);
            } else {
                setAuthUser(null);
                 toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin." });
            }
        } catch(e) {
            console.error("Failed to parse user from localStorage in AdminReportsPage:", e);
            setAuthUser(null);
            toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
        }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const processAttendanceData = useCallback(() => {
    if (allSchoolStudents.length === 0 && attendanceRecords.length === 0) {
       // If there are no students for the school at all, and no attendance, clear summaries.
      setClassSummaries([]);
      setOverallSummary(null);
      return;
    }
    if (allSchoolStudents.length > 0 && attendanceRecords.length === 0) {
        // Students exist, but no attendance records for the day (e.g., holiday, or not marked yet)
        // Show classes with 0 attendance.
        const summaries: ClassAttendanceSummary[] = allSchoolStudents
            .reduce((acc, student) => { // Group students by classId
                if (student.classId) {
                    let classGroup = acc.find(g => g.className === student.classId);
                    if (!classGroup) {
                        classGroup = { className: student.classId, students: [] };
                        acc.push(classGroup);
                    }
                    classGroup.students.push(student);
                }
                return acc;
            }, [] as { className: string; students: AppUser[] }[])
            .map(group => ({
                className: group.className,
                totalStudents: group.students.length,
                present: 0,
                absent: 0, // Or treat all as absent if no record means absent: group.students.length
                late: 0,
                attendancePercentage: 0,
            }))
            .sort((a, b) => a.className.localeCompare(b.className));
        
        setClassSummaries(summaries);
        setOverallSummary({
            totalStudents: allSchoolStudents.length,
            totalPresent: 0,
            totalAbsent: 0, // Or allSchoolStudents.length
            totalLate: 0,
            overallAttendancePercentage: 0,
        });
        return;
    }


    const classMap = new Map<string, { students: AppUser[], present: number, absent: number, late: number }>();

    allSchoolStudents.forEach(student => {
      if (student.classId) {
        if (!classMap.has(student.classId)) {
          classMap.set(student.classId, { students: [], present: 0, absent: 0, late: 0 });
        }
        classMap.get(student.classId)!.students.push(student);
      }
    });
    
    attendanceRecords.forEach(record => {
      if (classMap.has(record.className)) {
        const classData = classMap.get(record.className)!;
        if (record.status === 'present') classData.present++;
        else if (record.status === 'absent') classData.absent++;
        else if (record.status === 'late') classData.late++;
      }
    });

    let totalSchoolStudents = 0;
    let totalSchoolPresent = 0;
    let totalSchoolAbsent = 0;
    let totalSchoolLate = 0;

    const summaries: ClassAttendanceSummary[] = [];
    for (const [className, data] of classMap.entries()) {
      const totalStudentsInClass = data.students.length;
      // If attendance wasn't marked for some students in a class, they are effectively absent for that day's record.
      const markedStudentsCount = data.present + data.absent + data.late;
      const unmarkedAsAbsent = totalStudentsInClass - markedStudentsCount; // Students in class but not in attendance records

      const actualPresent = data.present;
      const actualLate = data.late;
      const actualAbsent = data.absent + (unmarkedAsAbsent > 0 ? unmarkedAsAbsent : 0) ;


      const attendedInClass = actualPresent + actualLate;
      const attendancePercentage = totalStudentsInClass > 0 ? Math.round((attendedInClass / totalStudentsInClass) * 100) : 0;
      
      summaries.push({
        className,
        totalStudents: totalStudentsInClass,
        present: actualPresent,
        absent: actualAbsent,
        late: actualLate,
        attendancePercentage,
      });

      totalSchoolStudents += totalStudentsInClass;
      totalSchoolPresent += actualPresent;
      totalSchoolAbsent += actualAbsent;
      totalSchoolLate += actualLate;
    }

    const overallAttended = totalSchoolPresent + totalSchoolLate;
    const overallAttendancePercentage = totalSchoolStudents > 0 ? Math.round((overallAttended / totalSchoolStudents) * 100) : 0;

    setOverallSummary({
        totalStudents: totalSchoolStudents,
        totalPresent: totalSchoolPresent,
        totalAbsent: totalSchoolAbsent,
        totalLate: totalSchoolLate,
        overallAttendancePercentage
    });
    
    setClassSummaries(summaries.sort((a, b) => a.className.localeCompare(b.className)));

  }, [allSchoolStudents, attendanceRecords]);

  useEffect(() => {
    processAttendanceData();
  }, [allSchoolStudents, attendanceRecords, processAttendanceData]);


  const loadReportData = useCallback(async (isManualRefresh = false) => {
    if (!authUser || !authUser.schoolId || !reportDate) {
      setAllSchoolStudents([]);
      setAttendanceRecords([]);
      setIsLoading(false);
      if (isManualRefresh && (!authUser || !authUser.schoolId || !reportDate)) {
          toast({variant: "info", title: "Cannot Refresh", description: "User, school or date info missing."});
      }
      return;
    }
    setIsLoading(true);

    let currentStudentList = allSchoolStudents;
    // Fetch or re-fetch students if list is empty, or if schoolId changed, or if it's a manual refresh
    if (isManualRefresh || currentStudentList.length === 0 || 
        (currentStudentList[0] && currentStudentList[0].schoolId?.toString() !== authUser.schoolId.toString())) {
      const studentsResult = await getSchoolUsers(authUser.schoolId.toString());
      if (studentsResult.success && studentsResult.users) {
        currentStudentList = studentsResult.users.filter(u => u.role === 'student');
        setAllSchoolStudents(currentStudentList); // This will trigger processAttendanceData
      } else {
        toast({ variant: "warning", title: "Student Data", description: studentsResult.message || "Could not fetch student list for report." });
        setAllSchoolStudents([]); // Clear students
        // processAttendanceData will clear summaries
        setIsLoading(false);
        return;
      }
    }
    
    const attendanceResult = await getDailyAttendanceForSchool(authUser.schoolId.toString(), reportDate);
    if (attendanceResult.success && attendanceResult.records) {
      setAttendanceRecords(attendanceResult.records); // This will trigger processAttendanceData
      if (attendanceResult.records.length === 0 && currentStudentList.length > 0 && isManualRefresh) {
        toast({ title: "No Attendance Data", description: "No attendance records found for the selected date." });
      }
    } else {
      toast({ variant: "destructive", title: "Report Data Error", description: attendanceResult.error || "Could not fetch attendance data." });
      setAttendanceRecords([]); // Clear attendance
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, reportDate, toast]); // allSchoolStudents intentionally omitted from deps to manage its refresh explicitly inside

  useEffect(() => {
    // Auto-load data when authUser or reportDate changes
    if (authUser && authUser.schoolId && reportDate) {
      loadReportData(false); // false indicates it's not a manual refresh
    }
  }, [authUser, reportDate, loadReportData]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BarChartBig className="mr-2 h-6 w-6" /> School Reports
          </CardTitle>
          <CardDescription>View summaries and reports for school operations.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <CardTitle>Daily Attendance Summary Report</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-auto">
                        <Label htmlFor="report-date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="report-date-picker"
                                variant={"outline"}
                                className="w-full sm:w-[240px] justify-start text-left font-normal"
                                disabled={isLoading || !authUser || !reportDate}
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={reportDate}
                                onSelect={setReportDate} // This will trigger the useEffect for loadReportData
                                initialFocus
                                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button 
                        variant="default" 
                        onClick={() => loadReportData(true)} // True for manual refresh
                        disabled={isLoading || !authUser || !reportDate}
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <BarChartBig className="mr-0 sm:mr-2 h-4 w-4"/>}
                        <span className="sm:inline hidden">Generate Report</span>
                        <span className="sm:hidden inline">Generate</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Generating report...</p>
            </div>
          ) : !authUser ? (
             <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view reports.</p>
          ) : !reportDate ? (
             <p className="text-center text-muted-foreground py-4">Please select a date to generate the report.</p>
          ) : classSummaries.length > 0 && overallSummary ? (
            <>
            <Card className="mb-6 bg-secondary/30">
                <CardHeader>
                    <CardTitle className="text-lg">Overall School Summary - {format(reportDate, "PPP")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-bold">{overallSummary.totalStudents}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Present</p>
                        <p className="text-2xl font-bold text-green-600">{overallSummary.totalPresent}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Absent</p>
                        <p className="text-2xl font-bold text-red-600">{overallSummary.totalAbsent}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Attendance %</p>
                        <p className="text-2xl font-bold text-blue-600">{overallSummary.overallAttendancePercentage}%</p>
                    </div>
                </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead className="text-center">Total Students</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSummaries.map((summary) => (
                  <TableRow key={summary.className}>
                    <TableCell className="font-medium">{summary.className}</TableCell>
                    <TableCell className="text-center">{summary.totalStudents}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{summary.present}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{summary.absent}</TableCell>
                    <TableCell className="text-center text-yellow-600 font-medium">{summary.late}</TableCell>
                    <TableCell className={`text-center font-bold ${summary.attendancePercentage >= 90 ? 'text-green-600' : summary.attendancePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {summary.attendancePercentage}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          ) : (
            <div className="text-center py-10">
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">No Data to Display</p>
                <p className="text-muted-foreground">
                    {(allSchoolStudents.length > 0 && attendanceRecords.length === 0) ? "No attendance was marked for this date, or all students were absent." : 
                     (allSchoolStudents.length === 0) ? "No students found for this school. Please add students via User Management." :
                     "No attendance data for the selected date."}
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

    