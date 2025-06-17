
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CBSEStateFront, { 
    type StudentData as FrontStudentData, 
    type SubjectFAData as FrontSubjectFAData, 
    type MarksEntry as FrontMarksEntry, 
    type CoCurricularSAData as FrontCoCurricularSAData 
} from '@/components/report-cards/CBSEStateFront';
import CBSEStateBack, {
    type SARowData as BackSARowData,
    type SAPeriodMarksEntry as BackSAPeriodMarksEntry,
    type AttendanceMonthData as BackAttendanceMonthData,
    defaultSaDataBack, 
} from '@/components/report-cards/CBSEStateBack';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, RotateCcw, Eye, EyeOff, Save, Loader2, User, School as SchoolIconUI, Search as SearchIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser, UserRole } from '@/types/user';
import { saveReportCard } from '@/app/actions/reports';
import type { ReportCardData, FormativeAssessmentEntryForStorage } from '@/types/report';
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label'; 
import { getStudentDetailsForReportCard, type StudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import { getClassDetailsById } from '@/app/actions/classes';
import { getSchoolById } from '@/app/actions/schools';
import type { SchoolClassSubject } from '@/types/classes';
import type { School } from '@/types/school';

// --- Defaults for Front Side ---
const coCurricularSubjectsListFront = ["Value Edn.", "Work Edn.", "Phy. Edn.", "Art. Edn."];

const getDefaultFaMarksEntryFront = (): FrontMarksEntry => ({ tool1: null, tool2: null, tool3: null, tool4: null });
const getDefaultSubjectFaDataFront = (): Record<string, FrontSubjectFAData> => ({}); // Changed to empty object
const getDefaultCoCurricularSaDataFront = (): FrontCoCurricularSAData => ({
  sa1Max: 50, sa1Marks: null, sa2Max: 50, sa2Marks: null, sa3Max: 50, sa3Marks: null,
});

const defaultStudentDataFront: FrontStudentData = {
  udiseCodeSchoolName: '',
  studentName: '',
  fatherName: '',
  motherName: '',
  class: '',
  section: '',
  studentIdNo: '',
  rollNo: '',
  medium: 'English',
  dob: '',
  admissionNo: '',
  examNo: '',
  aadharNo: '',
};

const defaultCoMarksFront: FrontCoCurricularSAData[] = coCurricularSubjectsListFront.map(() => getDefaultCoCurricularSaDataFront());


// --- Defaults for Back Side ---
const defaultAttendanceDataBack: BackAttendanceMonthData[] = Array(11).fill(null).map(() => ({ workingDays: null, presentDays: null }));

const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  if (currentMonth >= 5) { // June or later
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
};

export default function GenerateCBSEStateReportPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [admissionIdInput, setAdmissionIdInput] = useState<string>(""); 
  const [loadedStudent, setLoadedStudent] = useState<StudentDetailsForReportCard | null>(null);
  const [loadedClassSubjects, setLoadedClassSubjects] = useState<SchoolClassSubject[]>([]);
  const [teacherEditableSubjects, setTeacherEditableSubjects] = useState<string[]>([]);
  const [loadedSchool, setLoadedSchool] = useState<School | null>(null);
  const [isLoadingStudentAndClassData, setIsLoadingStudentAndClassData] = useState(false);


  // Front Side State
  const [studentData, setStudentData] = useState<FrontStudentData>(defaultStudentDataFront);
  const [faMarks, setFaMarks] = useState<Record<string, FrontSubjectFAData>>(getDefaultSubjectFaDataFront()); 
  const [coMarks, setCoMarks] = useState<FrontCoCurricularSAData[]>(defaultCoMarksFront); 
  const [frontSecondLanguage, setFrontSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');
  const [frontAcademicYear, setFrontAcademicYear] = useState<string>(getCurrentAcademicYear());

  // Back Side State
  const [saData, setSaData] = useState<BackSARowData[]>(defaultSaDataBack); 
  const [attendanceData, setAttendanceData] = useState<BackAttendanceMonthData[]>(defaultAttendanceDataBack);
  const [finalOverallGradeInput, setFinalOverallGradeInput] = useState<string | null>(null);

  const [showBackSide, setShowBackSide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && (parsedUser.role === 'admin' || parsedUser.role === 'teacher') && parsedUser.schoolId) { 
          setAuthUser(parsedUser);
        } else {
          toast({ variant: "destructive", title: "Access Denied", description: "You must be an admin or teacher." });
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    }
  }, [toast]);

  const initializeMarksForSubjects = useCallback((subjects: SchoolClassSubject[]) => {
    const newFaMarks: Record<string, FrontSubjectFAData> = {};
    subjects.forEach(subject => {
      newFaMarks[subject.name] = {
        fa1: getDefaultFaMarksEntryFront(),
        fa2: getDefaultFaMarksEntryFront(),
        fa3: getDefaultFaMarksEntryFront(),
        fa4: getDefaultFaMarksEntryFront(),
      };
    });
    setFaMarks(newFaMarks);
    // Reset SA data, which will trigger re-calculation of FA totals on the back
    setSaData(defaultSaDataBack.map(row => ({ ...row, faTotal200M: null })));
  }, []);


  const handleLoadStudentAndClassData = async () => {
    if (!admissionIdInput.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please enter an Admission ID." });
      return;
    }
    if (!authUser || !authUser.schoolId) {
        toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session or school ID missing." });
        return;
    }

    setIsLoadingStudentAndClassData(true);
    setLoadedStudent(null);
    setLoadedClassSubjects([]);
    setTeacherEditableSubjects([]);
    setStudentData(defaultStudentDataFront);
    setFaMarks(getDefaultSubjectFaDataFront());
    setSaData(defaultSaDataBack); 
    setCoMarks(defaultCoMarksFront);
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
    setFrontAcademicYear(getCurrentAcademicYear()); // Reset academic year


    try {
      const studentRes = await getStudentDetailsForReportCard(admissionIdInput, authUser.schoolId.toString());
      if (!studentRes.success || !studentRes.student) {
        toast({ variant: "destructive", title: "Student Not Found", description: studentRes.message || "Could not find student with that Admission ID." });
        setIsLoadingStudentAndClassData(false);
        return;
      }
      setLoadedStudent(studentRes.student);
      
      const schoolRes = await getSchoolById(studentRes.student.schoolId!);
      if(schoolRes.success && schoolRes.school) {
        setLoadedSchool(schoolRes.school);
      } else {
        toast({variant: "warning", title: "School Info", description: "Could not load school details for report header."});
      }

      if (studentRes.student.classId) { // classId for student is their actual class _id
        const classRes = await getClassDetailsById(studentRes.student.classId, studentRes.student.schoolId!);
        if (classRes.success && classRes.classDetails) {
          setLoadedClassSubjects(classRes.classDetails.subjects);
          initializeMarksForSubjects(classRes.classDetails.subjects);
          
          if (authUser.role === 'teacher') {
            const editableSubs = classRes.classDetails.subjects
              .filter(sub => sub.teacherId === authUser._id)
              .map(sub => sub.name);
            setTeacherEditableSubjects(editableSubs);
          }

          setStudentData(prev => ({
            ...prev,
            udiseCodeSchoolName: schoolRes.school?.schoolName || '', 
            studentName: studentRes.student?.name || '',
            class: classRes.classDetails.name || '', 
            studentIdNo: studentRes.student?._id || '', 
            admissionNo: studentRes.student?.admissionId || '',
          }));
        } else {
          toast({ variant: "destructive", title: "Class Details Error", description: classRes.message || "Could not load class subjects."});
        }
      } else {
        toast({ variant: "warning", title: "No Class Assigned", description: "This student is not assigned to any class." });
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error Loading Data", description: "An unexpected error occurred."});
      console.error("Error loading student/class data:", error);
    } finally {
      setIsLoadingStudentAndClassData(false);
    }
  };

  const calculateFaTotal200MForRow = useCallback((subjectNameForBack: string): number | null => {
    // For "Science" on back, sum FA of "Science" on front. Otherwise, direct match.
    const faSubjectKey = subjectNameForBack === "Physics" || subjectNameForBack === "Biology" ? "Science" : subjectNameForBack;
    
    const subjectFaData = faMarks[faSubjectKey]; // faMarks is Record<string, FrontSubjectFAData>
    if (!subjectFaData) return null;

    let overallTotal = 0;
    (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
      const periodMarks = subjectFaData[faPeriodKey];
      overallTotal += (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
    });
    return overallTotal > 200 ? 200 : overallTotal;
  }, [faMarks]);

  useEffect(() => {
    // Update SA data's FA total when faMarks change
    setSaData(prevSaData => 
      prevSaData.map(row => ({
        ...row,
        faTotal200M: calculateFaTotal200MForRow(row.subjectName) 
      }))
    );
  }, [faMarks, calculateFaTotal200MForRow]);


  const handleStudentDataChange = (field: keyof FrontStudentData, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaMarksChange = (subjectIdentifier: string, faPeriod: keyof FrontSubjectFAData, toolKey: keyof MarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const maxMark = toolKey === 'tool4' ? 20 : 10; 
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), maxMark);
    
    setFaMarks(prev => {
      const currentSubjectMarks = prev[subjectIdentifier] || {
        fa1: getDefaultFaMarksEntryFront(),
        fa2: getDefaultFaMarksEntryFront(),
        fa3: getDefaultFaMarksEntryFront(),
        fa4: getDefaultFaMarksEntryFront(),
      };
      const updatedPeriodMarks = { 
        ...(currentSubjectMarks[faPeriod] || getDefaultFaMarksEntryFront()), 
        [toolKey]: validatedValue 
      };
      return {
        ...prev,
        [subjectIdentifier]: {
          ...currentSubjectMarks,
          [faPeriod]: updatedPeriodMarks
        }
      };
    });
  };

  const handleCoMarksChange = (subjectIndex: number, saPeriodKey: 'sa1' | 'sa2' | 'sa3', type: 'Marks' | 'Max', value: string) => {
    const numValue = parseInt(value, 10);
    let validatedValue: number | null = isNaN(numValue) ? null : Math.max(numValue, 0);

    setCoMarks(prev => {
      const newCoMarks = prev.map((coSubj, idx) => {
        if (idx === subjectIndex) {
          const updatedSubj = { ...coSubj };
          const keyToUpdate = `${saPeriodKey}${type}` as keyof FrontCoCurricularSAData;
          if (type === 'Marks' && validatedValue !== null) {
            const maxKey = `${saPeriodKey}Max` as keyof FrontCoCurricularSAData;
            const currentMax = updatedSubj[maxKey] as number | null;
            if (currentMax !== null && validatedValue > currentMax) validatedValue = currentMax;
          }
          if (type === 'Max' && validatedValue !== null && validatedValue < 1) validatedValue = 1;
          (updatedSubj[keyToUpdate] as number | null) = validatedValue;
          return updatedSubj;
        }
        return coSubj;
      });
      return newCoMarks;
    });
  };

  const handleSaDataChange = (rowIndex: number, period: 'sa1' | 'sa2', asKey: keyof BackSAPeriodMarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), 20);

    setSaData(prev => prev.map((row, idx) => {
      if (idx === rowIndex) {
        const updatedRow = { ...row };
        if (period === 'sa1') updatedRow.sa1Marks = { ...updatedRow.sa1Marks, [asKey]: validatedValue };
        else updatedRow.sa2Marks = { ...updatedRow.sa2Marks, [asKey]: validatedValue };
        return updatedRow;
      }
      return row;
    }));
  };
  
  const handleFaTotalChangeBack = (rowIndex: number, value: string) => {
     const numValue = parseInt(value, 10);
     const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), 200);
     setSaData(prev => prev.map((row, idx) => 
        idx === rowIndex ? { ...row, faTotal200M: validatedValue } : row
     ));
  };

  const handleAttendanceDataChange = (monthIndex: number, type: 'workingDays' | 'presentDays', value: string) => {
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.max(numValue, 0);
    setAttendanceData(prev => prev.map((month, idx) => 
        idx === monthIndex ? { ...month, [type]: validatedValue } : month
    ));
  };

  // Function to set final grade already exists, no need for a new one.
  // setFinalOverallGradeInput will be passed directly.

  const handleLogData = () => {
    const formattedFaMarksForLog: FormativeAssessmentEntryForStorage[] = Object.entries(faMarks).map(([subjectName, marksData]) => ({
        subjectName,
        ...marksData,
    }));
    console.log("Report Card Data:", {
      targetStudentId: loadedStudent?._id || admissionIdInput,
      academicYear: frontAcademicYear,
      secondLanguage: frontSecondLanguage,
      studentInfo: studentData,
      formativeAssessments: formattedFaMarksForLog, 
      coCurricularAssessments: coMarks,
      summativeAssessments: saData,
      attendanceData,
      finalOverallGrade: finalOverallGradeInput,
      loadedClassSubjects,
      teacherEditableSubjects,
      currentUserRole: authUser?.role,
    });
    toast({ title: "Data Logged", description: "Current report card data logged to console."});
  };

  const handlePrint = () => window.print();
  
  const handleResetData = () => {
    setAdmissionIdInput("");
    setLoadedStudent(null);
    setLoadedClassSubjects([]);
    setTeacherEditableSubjects([]);
    setLoadedSchool(null);
    setStudentData(defaultStudentDataFront);
    setFaMarks(getDefaultSubjectFaDataFront());
    setCoMarks(defaultCoMarksFront);
    setFrontSecondLanguage('Hindi');
    setFrontAcademicYear(getCurrentAcademicYear());
    setSaData(defaultSaDataBack);
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
    toast({ title: "Data Reset", description: "All fields have been reset."});
  }

  const handleSaveReportCard = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id) {
      toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session not found." });
      return;
    }
    if (!loadedStudent || !loadedStudent._id) {
      toast({ variant: "destructive", title: "Missing Student ID", description: "Please load student data first using Admission ID." });
      return;
    }

    setIsSaving(true);

    const formativeAssessmentsForStorage: FormativeAssessmentEntryForStorage[] = Object.entries(faMarks)
      .map(([subjectName, marksData]) => ({
        subjectName,
        ...marksData,
      }));

    const reportPayload: Omit<ReportCardData, '_id' | 'createdAt' | 'updatedAt'> = {
      studentId: loadedStudent._id, 
      schoolId: (loadedSchool?._id || authUser.schoolId).toString(),
      academicYear: frontAcademicYear,
      reportCardTemplateKey: 'cbse_state', 
      studentInfo: studentData,
      formativeAssessments: formativeAssessmentsForStorage, 
      coCurricularAssessments: coMarks,
      secondLanguage: frontSecondLanguage,
      summativeAssessments: saData, 
      attendance: attendanceData,
      finalOverallGrade: finalOverallGradeInput, 
      generatedByAdminId: authUser._id.toString(),
      term: "Annual", 
    };

    const result = await saveReportCard(reportPayload);
    setIsSaving(false);

    if (result.success) {
      toast({ title: "Report Card Saved", description: result.message + (result.reportCardId ? ` ID: ${result.reportCardId}` : '') });
    } else {
      toast({ variant: "destructive", title: "Save Failed", description: result.error || result.message });
    }
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report-card, .printable-report-card * { visibility: visible !important; }
          .printable-report-card { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            transform: scale(0.95); 
            transform-origin: top left;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Generate CBSE State Pattern Report Card
          </CardTitle>
          <CardDescription>
            Logged in as: <span className="font-semibold capitalize">{authUser?.role || 'N/A'}</span>. 
            Enter Student's Admission ID to load data, then fill in marks.
            {authUser?.role === 'teacher' && " You can only edit marks for subjects assigned to you."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="w-full sm:w-auto">
              <Label htmlFor="admissionIdInput" className="mb-1 flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Enter Admission ID</Label>
              <Input 
                id="admissionIdInput"
                placeholder="Enter Admission ID"
                value={admissionIdInput}
                onChange={(e) => setAdmissionIdInput(e.target.value)}
                className="w-full sm:min-w-[250px]"
                disabled={isLoadingStudentAndClassData || isSaving}
              />
            </div>
             <Button onClick={handleLoadStudentAndClassData} disabled={isLoadingStudentAndClassData || isSaving || !admissionIdInput.trim()}>
                {isLoadingStudentAndClassData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchIcon className="mr-2 h-4 w-4"/>}
                Load Student & Class Data
            </Button>
            {authUser?.schoolId && 
              <div className="w-full sm:w-auto">
                <Label className="mb-1 flex items-center"><SchoolIconUI className="mr-2 h-4 w-4 text-muted-foreground"/>School ID (Auto)</Label>
                <Input value={authUser.schoolId.toString()} disabled className="w-full sm:min-w-[200px]" />
              </div>
            }
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveReportCard} disabled={isSaving || !loadedStudent || isLoadingStudentAndClassData}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              {isSaving ? "Saving..." : "Save Report Card"}
            </Button>
            <Button onClick={handleLogData} variant="outline">Log Current Data</Button>
            <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4"/> Print Preview</Button>
            <Button onClick={() => setShowBackSide(prev => !prev)} variant="secondary" className="ml-auto mr-2">
                {showBackSide ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {showBackSide ? "View Front" : "View Back"}
            </Button>
            <Button onClick={handleResetData} variant="destructive"><RotateCcw className="mr-2 h-4 w-4"/> Reset All</Button>
          </div>
        </CardContent>
      </Card>

      {isLoadingStudentAndClassData && (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading student and class information...</p>
        </div>
      )}

      {!isLoadingStudentAndClassData && loadedStudent && authUser && (
        <>
          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${showBackSide ? 'hidden' : ''}`}>
            <CBSEStateFront
              studentData={studentData} onStudentDataChange={handleStudentDataChange}
              academicSubjects={loadedClassSubjects} 
              faMarks={faMarks} onFaMarksChange={handleFaMarksChange} 
              coMarks={coMarks} onCoMarksChange={handleCoMarksChange}
              secondLanguage={frontSecondLanguage} onSecondLanguageChange={setFrontSecondLanguage}
              academicYear={frontAcademicYear} onAcademicYearChange={setFrontAcademicYear}
              currentUserRole={authUser.role as UserRole}
              editableSubjects={teacherEditableSubjects}
            />
          </div>
          
          {showBackSide && <div className="page-break no-print"></div>}

          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${!showBackSide ? 'hidden' : ''}`}>
            <CBSEStateBack
              saData={saData} onSaDataChange={handleSaDataChange} 
              onFaTotalChange={handleFaTotalChangeBack} 
              attendanceData={attendanceData} onAttendanceDataChange={handleAttendanceDataChange}
              finalOverallGradeInput={finalOverallGradeInput} onFinalOverallGradeInputChange={setFinalOverallGradeInput}
              secondLanguageSubjectName={frontSecondLanguage} 
              currentUserRole={authUser.role as UserRole}
              editableSubjects={teacherEditableSubjects}
            />
          </div>
        </>
      )}
      {!isLoadingStudentAndClassData && !loadedStudent && admissionIdInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Student data not loaded. Please ensure the Admission ID is correct and click "Load Student & Class Data".</p>
            </CardContent>
          </Card>
      )}
       {!isLoadingStudentAndClassData && !admissionIdInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Enter an Admission ID and click "Load Student & Class Data" to begin.</p>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

