
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
    defaultSaDataBack, // Import default SA data structure
} from '@/components/report-cards/CBSEStateBack';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, RotateCcw, Eye, EyeOff, Save, Loader2, User, School as SchoolIconUI, Search as SearchIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser } from '@/types/user';
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
const getDefaultSubjectFaDataFront = (): FrontSubjectFAData => ({
  fa1: getDefaultFaMarksEntryFront(), fa2: getDefaultFaMarksEntryFront(), fa3: getDefaultFaMarksEntryFront(), fa4: getDefaultFaMarksEntryFront(),
});
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


export default function GenerateCBSEStateReportPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [targetStudentIdInput, setTargetStudentIdInput] = useState<string>(""); 
  const [loadedStudent, setLoadedStudent] = useState<StudentDetailsForReportCard | null>(null);
  const [loadedClassSubjects, setLoadedClassSubjects] = useState<SchoolClassSubject[]>([]);
  const [loadedSchool, setLoadedSchool] = useState<School | null>(null);
  const [isLoadingStudentAndClassData, setIsLoadingStudentAndClassData] = useState(false);


  // Front Side State
  const [studentData, setStudentData] = useState<FrontStudentData>(defaultStudentDataFront);
  const [faMarks, setFaMarks] = useState<Record<string, FrontSubjectFAData>>({}); 
  const [coMarks, setCoMarks] = useState<FrontCoCurricularSAData[]>(defaultCoMarksFront); 
  const [frontSecondLanguage, setFrontSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');
  const [frontAcademicYear, setFrontAcademicYear] = useState<string>(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

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
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          toast({ variant: "destructive", title: "Access Denied", description: "You must be an admin." });
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    }
  }, [toast]);

  const initializeMarksForSubjects = useCallback((subjects: SchoolClassSubject[]) => {
    const newFaMarks: Record<string, FrontSubjectFAData> = {};
    subjects.forEach(subject => {
      // Use subject.name as the key for faMarks
      newFaMarks[subject.name] = getDefaultSubjectFaDataFront(); 
    });
    setFaMarks(newFaMarks);
    setSaData(defaultSaDataBack); // Keep SA data based on fixed structure for now
  }, []);

  const handleLoadStudentAndClassData = async () => {
    if (!targetStudentIdInput.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please enter a Student ID." });
      return;
    }
    if (!authUser || !authUser.schoolId) {
        toast({ variant: "destructive", title: "Error", description: "Admin session or school ID missing." });
        return;
    }

    setIsLoadingStudentAndClassData(true);
    setLoadedStudent(null);
    setLoadedClassSubjects([]);
    setStudentData(defaultStudentDataFront);
    setFaMarks({});
    setSaData(defaultSaDataBack); 
    setCoMarks(defaultCoMarksFront);
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);


    try {
      const studentRes = await getStudentDetailsForReportCard(targetStudentIdInput);
      if (!studentRes.success || !studentRes.student) {
        toast({ variant: "destructive", title: "Student Not Found", description: studentRes.message || "Could not find student." });
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

      if (studentRes.student.classId) {
        const classRes = await getClassDetailsById(studentRes.student.classId, studentRes.student.schoolId!);
        if (classRes.success && classRes.classDetails) {
          setLoadedClassSubjects(classRes.classDetails.subjects);
          initializeMarksForSubjects(classRes.classDetails.subjects);
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
    // The `subjectNameForBack` is from the fixed `backSubjectStructure` (e.g., "Telugu", "English", "Maths", "Science", "Social")
    // We need to find the FA data for this *main* subject from the `faMarks` object.
    const subjectKeyForFa = subjectNameForBack; // Direct mapping for most. "Science" on back should use "Science" FA from front.
    
    const subjectFaData = faMarks[subjectKeyForFa];
    if (!subjectFaData) return null;

    let overallTotal = 0;
    (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
      const periodMarks = subjectFaData[faPeriodKey];
      overallTotal += (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
    });
    return overallTotal > 200 ? 200 : overallTotal; // Cap at 200
  }, [faMarks]);

  useEffect(() => {
    // Update faTotal200M in saData whenever faMarks changes or loadedClassSubjects changes (which triggers faMarks init)
    setSaData(prevSaData => 
      prevSaData.map(row => ({
        ...row,
        // `row.subjectName` here is from the fixed structure of `defaultSaDataBack`
        faTotal200M: calculateFaTotal200MForRow(row.subjectName) 
      }))
    );
  }, [faMarks, calculateFaTotal200MForRow]); 


  const handleStudentDataChange = (field: keyof FrontStudentData, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaMarksChange = (subjectIdentifier: string, faPeriod: keyof FrontSubjectFAData, toolKey: keyof FrontMarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const maxMark = toolKey === 'tool4' ? 20 : 10; 
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), maxMark);
    
    setFaMarks(prev => {
      const currentSubjectMarks = prev[subjectIdentifier] || getDefaultSubjectFaDataFront();
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

  const handleCoMarksChange = (subjectIndex: number, saPeriod: 'sa1' | 'sa2' | 'sa3', type: 'Marks' | 'Max', value: string) => {
    const numValue = parseInt(value, 10);
    let validatedValue: number | null = isNaN(numValue) ? null : Math.max(numValue, 0);

    setCoMarks(prev => {
      const newCoMarks = prev.map((coSubj, idx) => {
        if (idx === subjectIndex) {
          const updatedSubj = { ...coSubj };
          const keyToUpdate = \`\${saPeriodKey}\${type}\` as keyof FrontCoCurricularSAData;
          if (type === 'Marks' && validatedValue !== null) {
            const maxKey = \`\${saPeriodKey}Max\` as keyof FrontCoCurricularSAData;
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

  const handleFinalOverallGradeInputChange = (value: string) => {
      setFinalOverallGradeInput(value);
  }

  const handleLogData = () => {
    const formattedFaMarksForLog: FormativeAssessmentEntryForStorage[] = Object.entries(faMarks).map(([subjectName, marksData]) => ({
        subjectName,
        ...marksData,
    }));
    console.log("Report Card Data:", {
      targetStudentId: loadedStudent?._id || targetStudentIdInput,
      academicYear: frontAcademicYear,
      secondLanguage: frontSecondLanguage,
      studentInfo: studentData,
      formativeAssessments: formattedFaMarksForLog, 
      coCurricularAssessments: coMarks,
      summativeAssessments: saData,
      attendanceData,
      finalOverallGrade: finalOverallGradeInput,
      loadedClassSubjects,
    });
    toast({ title: "Data Logged", description: "Current report card data logged to console."});
  };

  const handlePrint = () => window.print();
  
  const handleResetData = () => {
    setTargetStudentIdInput("");
    setLoadedStudent(null);
    setLoadedClassSubjects([]);
    setLoadedSchool(null);
    setStudentData(defaultStudentDataFront);
    setFaMarks({});
    setCoMarks(coCurricularSubjectsListFront.map(() => getDefaultCoCurricularSaDataFront()));
    setFrontSecondLanguage('Hindi');
    setFrontAcademicYear(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
    setSaData(defaultSaDataBack);
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
    toast({ title: "Data Reset", description: "All fields have been reset."});
  }

  const handleSaveReportCard = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id) {
      toast({ variant: "destructive", title: "Error", description: "Admin session not found." });
      return;
    }
    if (!loadedStudent || !loadedStudent._id) {
      toast({ variant: "destructive", title: "Missing Student ID", description: "Please load student data first." });
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
      toast({ title: "Report Card Saved", description: result.message + (result.reportCardId ? \` ID: \${result.reportCardId}\` : '') });
    } else {
      toast({ variant: "destructive", title: "Save Failed", description: result.error || result.message });
    }
  };

  return (
    <div className="space-y-6">
      <style jsx global>{\`
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
      \`}</style>
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Generate CBSE State Pattern Report Card
          </CardTitle>
          <CardDescription>
            Enter Student ID to load data, then fill in the details. Calculations will update automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="w-full sm:w-auto">
              <Label htmlFor="targetStudentIdInput" className="mb-1 flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Target Student ID</Label>
              <Input 
                id="targetStudentIdInput"
                placeholder="Enter Student ID"
                value={targetStudentIdInput}
                onChange={(e) => setTargetStudentIdInput(e.target.value)}
                className="w-full sm:min-w-[250px]"
                disabled={isLoadingStudentAndClassData || isSaving}
              />
            </div>
             <Button onClick={handleLoadStudentAndClassData} disabled={isLoadingStudentAndClassData || isSaving || !targetStudentIdInput.trim()}>
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

      {!isLoadingStudentAndClassData && loadedStudent && (
        <>
          <div className={\`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md \${showBackSide ? 'hidden' : ''}\`}>
            <CBSEStateFront
              studentData={studentData} onStudentDataChange={handleStudentDataChange}
              academicSubjects={loadedClassSubjects} 
              faMarks={faMarks} onFaMarksChange={handleFaMarksChange} 
              coMarks={coMarks} onCoMarksChange={handleCoMarksChange}
              secondLanguage={frontSecondLanguage} onSecondLanguageChange={setFrontSecondLanguage}
              academicYear={frontAcademicYear} onAcademicYearChange={setFrontAcademicYear}
            />
          </div>
          
          {showBackSide && <div className="page-break no-print"></div>}

          <div className={\`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md \${!showBackSide ? 'hidden' : ''}\`}>
            <CBSEStateBack
              saData={saData} onSaDataChange={handleSaDataChange} 
              onFaTotalChange={handleFaTotalChangeBack} // This prop allows manual override if needed
              attendanceData={attendanceData} onAttendanceDataChange={handleAttendanceDataChange}
              finalOverallGradeInput={finalOverallGradeInput} onFinalOverallGradeInputChange={setFinalOverallGradeInputChange}
              secondLanguageSubjectName={frontSecondLanguage} 
            />
          </div>
        </>
      )}
      {!isLoadingStudentAndClassData && !loadedStudent && targetStudentIdInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Student data not loaded. Please ensure the Student ID is correct and click "Load Student & Class Data".</p>
            </CardContent>
          </Card>
      )}
       {!isLoadingStudentAndClassData && !targetStudentIdInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Enter a Student ID and click "Load Student & Class Data" to begin.</p>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

