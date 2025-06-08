
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChartBig, CalendarDays, Loader2, Info, Download, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getDailyAttendanceForSchool } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";
import type { User as AppUser } from "@/types/user";
import type { School } from "@/types/school";
import type { FeePayment } from "@/types/fees";
import { getSchoolUsers } from "@/app/actions/schoolUsers";
import { getSchoolById } from "@/app/actions/schools";
import { getFeePaymentsBySchool } from "@/app/actions/fees";

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

interface ClassFeeSummary {
  className: string;
  totalExpected: number;
  totalCollected: number;
  totalDue: number;
  collectionPercentage: number;
}

interface OverallFeeSummary {
  grandTotalExpected: number;
  grandTotalCollected: number;
  grandTotalDue: number;
  overallCollectionPercentage: number;
}


export default function AdminReportsPage() {
  const [reportDate, setReportDate] = useState<Date | undefined>(undefined);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassAttendanceSummary[]>([]);
  const [overallSummary, setOverallSummary] = useState<OverallAttendanceSummary | null>(null);
  
  const [allSchoolStudents, setAllSchoolStudents] = useState<AppUser[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [allSchoolPayments, setAllSchoolPayments] = useState<FeePayment[]>([]);
  const [feeClassSummaries, setFeeClassSummaries] = useState<ClassFeeSummary[]>([]);
  const [feeOverallSummary, setFeeOverallSummary] = useState<OverallFeeSummary | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
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

  const calculateTotalFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig) return 0;
    const classFeeConfig = schoolConfig.classFees.find(cf => cf.className === className);
    if (!classFeeConfig) return 0;
    return (classFeeConfig.tuitionFee || 0) + (classFeeConfig.busFee || 0) + (classFeeConfig.canteenFee || 0);
  }, []);

  const processAttendanceData = useCallback(() => {
    if (allSchoolStudents.length === 0 && attendanceRecords.length === 0) {
      setClassSummaries([]);
      setOverallSummary(null);
      return;
    }
    if (allSchoolStudents.length > 0 && attendanceRecords.length === 0 && reportDate) { // Check reportDate to ensure it's not an initial empty state
        const summaries: ClassAttendanceSummary[] = allSchoolStudents
            .reduce((acc, student) => { 
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
                absent: group.students.length, // All absent if no records for the day
                late: 0,
                attendancePercentage: 0,
            }))
            .sort((a, b) => a.className.localeCompare(b.className));
        
        setClassSummaries(summaries);
        setOverallSummary({
            totalStudents: allSchoolStudents.length,
            totalPresent: 0,
            totalAbsent: allSchoolStudents.length, // All absent
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
      const markedStudentsCount = data.present + data.absent + data.late;
      const unmarkedAsAbsent = totalStudentsInClass - markedStudentsCount; 

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

  }, [allSchoolStudents, attendanceRecords, reportDate]);


 const processFeeData = useCallback(() => {
    if (!allSchoolStudents.length || !schoolDetails || !allSchoolPayments) {
      setFeeClassSummaries([]);
      setFeeOverallSummary(null);
      return;
    }

    let grandTotalExpected = 0;
    let grandTotalCollected = 0;

    const classFeeMap = new Map<string, { totalExpected: number, totalCollected: number, studentCount: number }>();

    allSchoolStudents.forEach(student => {
      if (student.classId) {
        const studentTotalFee = calculateTotalFee(student.classId, schoolDetails);
        const studentPayments = allSchoolPayments.filter(p => p.studentId.toString() === student._id.toString());
        const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);

        grandTotalExpected += studentTotalFee;
        grandTotalCollected += studentTotalPaid;

        if (!classFeeMap.has(student.classId)) {
          classFeeMap.set(student.classId, { totalExpected: 0, totalCollected: 0, studentCount: 0 });
        }
        const classData = classFeeMap.get(student.classId)!;
        classData.totalExpected += studentTotalFee;
        classData.totalCollected += studentTotalPaid;
        classData.studentCount++;
      }
    });

    const feeSummaries: ClassFeeSummary[] = [];
    for (const [className, data] of classFeeMap.entries()) {
      const totalDue = data.totalExpected - data.totalCollected;
      const collectionPercentage = data.totalExpected > 0 ? Math.round((data.totalCollected / data.totalExpected) * 100) : 0;
      feeSummaries.push({
        className,
        totalExpected: data.totalExpected,
        totalCollected: data.totalCollected,
        totalDue,
        collectionPercentage,
      });
    }

    const grandTotalDue = grandTotalExpected - grandTotalCollected;
    const overallCollectionPercentage = grandTotalExpected > 0 ? Math.round((grandTotalCollected / grandTotalExpected) * 100) : 0;

    setFeeOverallSummary({
      grandTotalExpected,
      grandTotalCollected,
      grandTotalDue,
      overallCollectionPercentage,
    });
    setFeeClassSummaries(feeSummaries.sort((a,b) => a.className.localeCompare(b.className)));

  }, [allSchoolStudents, schoolDetails, allSchoolPayments, calculateTotalFee]);


  useEffect(() => {
    processAttendanceData();
  }, [allSchoolStudents, attendanceRecords, processAttendanceData]);

  useEffect(() => {
    processFeeData();
  }, [allSchoolStudents, schoolDetails, allSchoolPayments, processFeeData]);


  const loadReportData = useCallback(async (isManualRefresh = false) => {
    if (!authUser || !authUser.schoolId) {
        setIsLoading(false);
        return;
    }
    if (!reportDate && !isManualRefresh) { // For fee report, date is not strictly needed but included for consistency
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    let currentStudentList = allSchoolStudents;
    let currentSchoolDetails = schoolDetails;
    // let currentSchoolPayments = allSchoolPayments; // Not directly using this for decision to fetch, will always fetch payments on manual refresh or if empty

    // Fetch students if list is empty, schoolId changed, or manual refresh
    if (isManualRefresh || currentStudentList.length === 0 || 
        (currentStudentList[0] && currentStudentList[0].schoolId?.toString() !== authUser.schoolId.toString())) {
      const studentsResult = await getSchoolUsers(authUser.schoolId.toString());
      if (studentsResult.success && studentsResult.users) {
        currentStudentList = studentsResult.users.filter(u => u.role === 'student');
        setAllSchoolStudents(currentStudentList); 
      } else {
        toast({ variant: "warning", title: "Student Data", description: studentsResult.message || "Could not fetch student list." });
        setAllSchoolStudents([]);
      }
    }

    // Fetch school details if not present or manual refresh
    if (isManualRefresh || !currentSchoolDetails) {
        const schoolRes = await getSchoolById(authUser.schoolId.toString());
        if (schoolRes.success && schoolRes.school) {
            currentSchoolDetails = schoolRes.school;
            setSchoolDetails(currentSchoolDetails);
        } else {
            toast({ variant: "destructive", title: "School Info Error", description: schoolRes.message || "Could not load school details for reports."});
            setSchoolDetails(null);
        }
    }

    // Always fetch payments on manual refresh, or if current list is empty.
    // The allSchoolPayments state doesn't depend on reportDate, so it's fetched once unless manually refreshed.
     if (isManualRefresh || allSchoolPayments.length === 0) {
        const paymentsResult = await getFeePaymentsBySchool(authUser.schoolId.toString());
        if (paymentsResult.success && paymentsResult.payments) {
            setAllSchoolPayments(paymentsResult.payments);
        } else {
            toast({ variant: "warning", title: "Fee Payment Data", description: paymentsResult.message || "Could not fetch fee payments." });
            setAllSchoolPayments([]);
        }
    }

    // Fetch attendance if reportDate is set
    if (reportDate) {
        const attendanceResult = await getDailyAttendanceForSchool(authUser.schoolId.toString(), reportDate);
        if (attendanceResult.success && attendanceResult.records) {
        setAttendanceRecords(attendanceResult.records); 
        if (attendanceResult.records.length === 0 && currentStudentList.length > 0 && isManualRefresh) {
            toast({ title: "No Attendance Data", description: "No attendance records found for the selected date." });
        }
        } else {
        toast({ variant: "destructive", title: "Attendance Data Error", description: attendanceResult.error || "Could not fetch attendance data." });
        setAttendanceRecords([]);
        }
    } else {
        setAttendanceRecords([]); // Clear if no date
    }
    
    setIsLoading(false);
  }, [authUser, reportDate, toast, allSchoolStudents, schoolDetails, allSchoolPayments]); 

  useEffect(() => {
    if (authUser && authUser.schoolId && reportDate) { // Initial load for attendance uses reportDate
      loadReportData(false); 
    } else if (authUser && authUser.schoolId && (!allSchoolStudents.length || !schoolDetails || !allSchoolPayments.length)) {
        // Initial load for fee data if attendance specific data not ready (e.g. reportDate not set)
        loadReportData(false);
    }
  }, [authUser, reportDate, loadReportData, allSchoolStudents.length, schoolDetails, allSchoolPayments.length]);


  const handleDownloadAttendancePdf = async () => {
    const reportContent = document.getElementById('attendanceReportContent');
    if (!reportContent) {
      toast({ variant: "destructive", title: "Error", description: "Report content not found for PDF generation." });
      return;
    }
    if (!reportDate) {
        toast({ variant: "info", title: "Select Date", description: "Please select a date for the report." });
        return;
    }

    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(reportContent, {
        scale: 2, // Increase scale for better quality
        useCORS: true,
        logging: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape', // 'portrait' or 'landscape'
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      
      // Calculate the aspect ratio
      const ratio = imgWidth / imgHeight;
      let newImgWidth = pdfWidth - 20; // 10mm margin on each side
      let newImgHeight = newImgWidth / ratio;

      // If new height is too large, adjust based on height
      if (newImgHeight > pdfHeight - 20) {
        newImgHeight = pdfHeight - 20; // 10mm margin on top/bottom
        newImgWidth = newImgHeight * ratio;
      }
      
      const x = (pdfWidth - newImgWidth) / 2;
      const y = (pdfHeight - newImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
      pdf.save(`Attendance_Report_${format(reportDate, "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "PDF Error", description: "Could not generate PDF. See console for details."});
    } finally {
      setIsDownloadingPdf(false);
    }
  };


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

      {/* Attendance Summary Report */}
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
                                onSelect={setReportDate}
                                initialFocus
                                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button 
                        variant="default" 
                        onClick={() => loadReportData(true)} 
                        disabled={isLoading || !authUser || !reportDate}
                        className="w-full sm:w-auto"
                    >
                        {isLoading && !isDownloadingPdf ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <BarChartBig className="mr-0 sm:mr-2 h-4 w-4"/>}
                        <span className="sm:inline hidden">Generate Report</span>
                        <span className="sm:hidden inline">Generate</span>
                    </Button>
                     <Button 
                        variant="outline" 
                        onClick={handleDownloadAttendancePdf} 
                        disabled={isLoading || isDownloadingPdf || !authUser || !reportDate || !overallSummary}
                        className="w-full sm:w-auto"
                    >
                        {isDownloadingPdf ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-0 sm:mr-2 h-4 w-4"/>}
                        <span className="sm:inline hidden">Download PDF</span>
                        <span className="sm:hidden inline">PDF</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading && !isDownloadingPdf ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Generating attendance report...</p>
            </div>
          ) : !authUser ? (
             <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view reports.</p>
          ) : !reportDate ? (
             <p className="text-center text-muted-foreground py-4">Please select a date to generate the attendance report.</p>
          ) : classSummaries.length > 0 && overallSummary ? (
            <div id="attendanceReportContent" className="p-4 bg-card rounded-md"> {/* Added ID and padding for PDF capture */}
            <Card className="mb-6 bg-secondary/30 border-none shadow-none"> {/* Make internal card less prominent for PDF */}
                <CardHeader className="pt-2 pb-2">
                    <CardTitle className="text-lg">Overall School Attendance - {format(reportDate, "PPP")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center pb-2">
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
                        <p className="text-sm text-muted-foreground">Late</p>
                        <p className="text-2xl font-bold text-yellow-600">{overallSummary.totalLate}</p>
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
            </div>
          ) : (
            <div className="text-center py-10">
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">No Attendance Data to Display</p>
                <p className="text-muted-foreground">
                    {(allSchoolStudents.length > 0 && attendanceRecords.length === 0) ? "No attendance was marked for this date, or all students were absent." : 
                     (allSchoolStudents.length === 0) ? "No students found for this school. Please add students via User Management." :
                     "No attendance data for the selected date."}
                </p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Fee Collection Summary Report */}
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                 <CardTitle>Fee Collection Summary Report (All Time)</CardTitle>
                 {/* Placeholder for fee report specific actions like PDF download if added later */}
            </div>
        </CardHeader>
        <CardContent>
             {isLoading && !feeOverallSummary ? (
                 <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading fee collection data...</p>
                </div>
             ) : !authUser ? (
                <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view reports.</p>
             ) : feeClassSummaries.length > 0 && feeOverallSummary ? (
                <>
                <Card className="mb-6 bg-secondary/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Overall School Fee Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Expected</p>
                            <p className="text-2xl font-bold">${feeOverallSummary.grandTotalExpected.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Collected</p>
                            <p className="text-2xl font-bold text-green-600">${feeOverallSummary.grandTotalCollected.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Due</p>
                            <p className="text-2xl font-bold text-red-600">${feeOverallSummary.grandTotalDue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Collection %</p>
                            <p className="text-2xl font-bold text-blue-600">{feeOverallSummary.overallCollectionPercentage}%</p>
                            <Progress value={feeOverallSummary.overallCollectionPercentage} className="h-2 mt-1" />
                        </div>
                    </CardContent>
                </Card>

                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead className="text-right">Expected Fees</TableHead>
                    <TableHead className="text-right">Collected Fees</TableHead>
                    <TableHead className="text-right">Dues</TableHead>
                    <TableHead className="text-center">Collection %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {feeClassSummaries.map((summary) => (
                    <TableRow key={summary.className}>
                        <TableCell className="font-medium">{summary.className}</TableCell>
                        <TableCell className="text-right">${summary.totalExpected.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">${summary.totalCollected.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">${summary.totalDue.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                                <span className={`font-bold ${summary.collectionPercentage >= 90 ? 'text-green-600' : summary.collectionPercentage >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {summary.collectionPercentage}%
                                </span>
                                <Progress value={summary.collectionPercentage} className="h-1.5 w-20 mt-1" />
                            </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
                </>
             ) : (
                <div className="text-center py-10">
                    <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold">No Fee Data to Display</p>
                    <p className="text-muted-foreground">
                        {(!allSchoolStudents.length) ? "No students found for this school. Please add students." : 
                         (!schoolDetails) ? "School fee structure not loaded. Cannot calculate fee summaries." : 
                         (!allSchoolPayments.length && schoolDetails && allSchoolStudents.length > 0) ? "No fee payments have been recorded for this school yet." :
                         "Fee data is currently unavailable."
                        }
                    </p>
                </div>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
