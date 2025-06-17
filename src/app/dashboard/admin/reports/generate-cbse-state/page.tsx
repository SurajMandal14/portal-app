
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
import { FileText, Printer, RotateCcw, Eye, EyeOff, Save, Loader2, User, School as SchoolIconUI, Search as SearchIcon, AlertTriangle } from 'lucide-react';
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
import { getStudentMarksForReportCard } from '@/app/actions/marks'; // Import new action


const getDefaultFaMarksEntryFront = (): FrontMarksEntry => ({ tool1: null, tool2: null, tool3: null, tool4: null });
const getDefaultSubjectFaDataFront = (): Record<string, FrontSubjectFAData> => ({});

// Co-curricular data is kept for potential future dynamic implementation, but rendering is removed.
const defaultCoMarksFront: FrontCoCurricularSAData[] = []; 

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

const defaultAttendanceDataBack: BackAttendanceMonthData[] = Array(11).fill(null).map(() => ({ workingDays: null, presentDays: null }));

const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  if (currentMonth >= 5) { 
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
  const [teacherEditableSubjects, setTeacherEditableSubjects] = useState<string[]>([]); // Still relevant for teacher role if they access this
  const [loadedSchool, setLoadedSchool] = useState<School | null>(null);
  const [isLoadingStudentAndClassData, setIsLoadingStudentAndClassData] = useState(false);

  const [studentData, setStudentData] = useState<FrontStudentData>(defaultStudentDataFront);
  const [faMarks, setFaMarks] = useState<Record<string, FrontSubjectFAData>>(getDefaultSubjectFaDataFront()); 
  const [coMarks, setCoMarks] = useState<FrontCoCurricularSAData[]>(defaultCoMarksFront); 
  const [frontSecondLanguage, setFrontSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');
  const [frontAcademicYear, setFrontAcademicYear] = useState<string>(getCurrentAcademicYear());

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
        // Allow admin and teacher, but specific editability is handled by components
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
    // Re-initialize SA data with default FA totals as well, or ensure calculateFaTotal200MForRow is called
     setSaData(prevSaData => 
        defaultSaDataBack.map(defaultRow => ({
            ...defaultRow,
            faTotal200M: null // Reset FA total until marks are loaded/calculated
        }))
    );
  }, []);


  const handleLoadStudentAndClassData = async () => {
    if (!admissionIdInput.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please enter an Admission ID." });
      return;
    }
    if (!authUser || !authUser.schoolId || !authUser._id) {
        toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session or school ID missing." });
        return;
    }

    setIsLoadingStudentAndClassData(true);
    setLoadedStudent(null);
    setLoadedClassSubjects([]);
    setTeacherEditableSubjects([]);
    setLoadedSchool(null);
    setStudentData(defaultStudentDataFront);
    setFaMarks(getDefaultSubjectFaDataFront());
    setSaData(defaultSaDataBack); 
    setCoMarks(defaultCoMarksFront);
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
    // Keep frontAcademicYear as set by admin, don't reset to current every time

    try {
      const studentRes = await getStudentDetailsForReportCard(admissionIdInput, authUser.schoolId.toString());
      
      if (!studentRes.success || !studentRes.student) {
        toast({ variant: "destructive", title: "Student Not Found", description: studentRes.message || `Could not find student with Admission ID: ${admissionIdInput}.` });
        setIsLoadingStudentAndClassData(false);
        return;
      }
      if (!studentRes.student.classId) {
        toast({ variant: "destructive", title: "Class Assignment Missing", description: `Student ${studentRes.student.name} is not assigned to any class.` });
        setIsLoadingStudentAndClassData(false);
        return;
      }
      if (!studentRes.student.schoolId) {
         toast({ variant: "destructive", title: "School ID Missing", description: `Student ${studentRes.student.name} does not have a school ID associated.` });
        setIsLoadingStudentAndClassData(false);
        return;
      }
      setLoadedStudent(studentRes.student);
      
      const schoolRes = await getSchoolById(studentRes.student.schoolId);
      if(schoolRes.success && schoolRes.school) {
        setLoadedSchool(schoolRes.school);
      } else {
        toast({variant: "warning", title: "School Info", description: "Could not load school details for report header."});
      }

      const classRes = await getClassDetailsById(studentRes.student.classId, studentRes.student.schoolId);
      let currentLoadedClassSubjects: SchoolClassSubject[] = [];
      if (classRes.success && classRes.classDetails) {
        currentLoadedClassSubjects = classRes.classDetails.subjects;
        setLoadedClassSubjects(currentLoadedClassSubjects);
        
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
          fatherName: studentRes.student?.fatherName || '',
          motherName: studentRes.student?.motherName || '',
          class: classRes.classDetails?.name || '', 
          section: studentRes.student?.section || '',
          studentIdNo: studentRes.student?._id || '', 
          rollNo: studentRes.student?.rollNo || '',
          dob: studentRes.student?.dob || '',
          admissionNo: studentRes.student?.admissionId || '',
          examNo: studentRes.student?.examNo || '',
          aadharNo: studentRes.student?.aadharNo || '',
        }));
      } else {
        toast({ variant: "destructive", title: "Class Details Error", description: classRes.message || `Could not load class details for class ID: ${studentRes.student.classId}. Ensure it's a valid Class ID.`});
        setIsLoadingStudentAndClassData(false);
        return; 
      }

      // Fetch and process marks
      const marksResult = await getStudentMarksForReportCard(
        studentRes.student._id,
        studentRes.student.schoolId,
        frontAcademicYear, // Use the year set on the page
        studentRes.student.classId
      );

      const newFaMarksForState: Record<string, FrontSubjectFAData> = {};
      currentLoadedClassSubjects.forEach(subject => {
        newFaMarksForState[subject.name] = {
          fa1: { tool1: null, tool2: null, tool3: null, tool4: null },
          fa2: { tool1: null, tool2: null, tool3: null, tool4: null },
          fa3: { tool1: null, tool2: null, tool3: null, tool4: null },
          fa4: { tool1: null, tool2: null, tool3: null, tool4: null },
        };
      });

      if (marksResult.success && marksResult.marks) {
        const allFetchedMarks = marksResult.marks;
        
        currentLoadedClassSubjects.forEach(subject => {
          const subjectIdentifier = subject.name;
          const subjectSpecificMarks = allFetchedMarks.filter(
            mark => mark.subjectName === subjectIdentifier &&
                    mark.academicYear === frontAcademicYear &&
                    mark.classId === studentRes.student?.classId
          );

          subjectSpecificMarks.forEach(mark => {
            const assessmentNameParts = mark.assessmentName.split('-'); // e.g., "FA1-Tool1"
            if (assessmentNameParts.length === 2) {
              const faPeriodKey = assessmentNameParts[0].toLowerCase() as keyof FrontSubjectFAData; // "fa1"
              const toolKeyRaw = assessmentNameParts[1]; // "Tool1"
              const toolKey = (toolKeyRaw.charAt(0).toLowerCase() + toolKeyRaw.slice(1)) as keyof FrontMarksEntry;

              if (newFaMarksForState[subjectIdentifier] &&
                  newFaMarksForState[subjectIdentifier][faPeriodKey] &&
                  toolKey in newFaMarksForState[subjectIdentifier][faPeriodKey]) {
                (newFaMarksForState[subjectIdentifier][faPeriodKey] as any)[toolKey] = mark.marksObtained;
              }
            }
          });
        });
      } else {
        if (!marksResult.success) {
            toast({ variant: "warning", title: "Marks Info", description: marksResult.message || "Could not load student marks for the report."});
        }
      }
      setFaMarks(newFaMarksForState); // Update the state


    } catch (error) {
      toast({ variant: "destructive", title: "Error Loading Data", description: "An unexpected error occurred."});
      console.error("Error loading student/class data:", error);
    } finally {
      setIsLoadingStudentAndClassData(false);
    }
  };

  const calculateFaTotal200MForRow = useCallback((subjectNameForBack: string): number | null => {
    // For Science on back, sum Physics and Biology from front
    // This specific mapping logic for "Science" on the back page might need to be adjusted if
    // Physics and Biology are separate academic subjects on the front.
    // For now, assuming `faMarks` keys match the `subjectNameForBack` or there's a specific handling.
    
    // If the report card expects a single "Science" row on the back but FA marks are entered for "Physics" and "Biology" separately on the front,
    // this calculation will need to be more complex, summing relevant totals from both.
    // For simplicity, let's assume direct mapping or that "Science" is a subject in faMarks.
    const faSubjectKey = (subjectNameForBack === "Physics" || subjectNameForBack === "Biology") ? "Science" : subjectNameForBack;
    
    const subjectFaData = faMarks[faSubjectKey];
    if (!subjectFaData) return null;

    let overallTotal = 0;
    (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
      const periodMarks = subjectFaData[faPeriodKey];
      overallTotal += (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
    });
    return overallTotal > 200 ? 200 : overallTotal; // Cap at 200
  }, [faMarks]);

  useEffect(() => {
    // This effect updates the SA data's FA total column whenever faMarks (from front page) changes.
    setSaData(prevSaData => 
      prevSaData.map(row => ({
        ...row,
        faTotal200M: calculateFaTotal200MForRow(row.subjectName) 
      }))
    );
  }, [faMarks, calculateFaTotal200MForRow]);


  const handleStudentDataChange = (field: keyof FrontStudentData, value: string) => {
    if (authUser?.role === 'admin' && loadedStudent) return; // Admin cannot edit student details here
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaMarksChange = (subjectIdentifier: string, faPeriod: keyof FrontSubjectFAData, toolKey: keyof FrontMarksEntry, value: string) => {
    if (authUser?.role === 'admin') return; // Admin cannot edit marks
    if (authUser?.role === 'teacher' && !teacherEditableSubjects.includes(subjectIdentifier)) return; // Teacher can only edit assigned subjects

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
    if (authUser?.role === 'admin' && loadedStudent) return; // Admin cannot edit co-curricular marks here
    // Teachers generally don't handle co-curricular on this template, but check can be added if needed.
    
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
     if (authUser?.role === 'admin' && loadedStudent) return;
     const subjectName = saData[rowIndex]?.subjectName;
     if (authUser?.role === 'teacher' && subjectName && !isSubjectEditableForTeacher(subjectName)) return;


    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), 20); // Max for AS is 20

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
    if (authUser?.role === 'admin' && loadedStudent) return; // Admins should not edit this directly, it's calculated
    const subjectName = saData[rowIndex]?.subjectName;
    if (authUser?.role === 'teacher' && subjectName && !isSubjectEditableForTeacher(subjectName)) return;

     const numValue = parseInt(value, 10);
     const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), 200);
     setSaData(prev => prev.map((row, idx) => 
        idx === rowIndex ? { ...row, faTotal200M: validatedValue } : row
     ));
  };

  const handleAttendanceDataChange = (monthIndex: number, type: 'workingDays' | 'presentDays', value: string) => {
     if (authUser?.role === 'admin' && loadedStudent) return;
     // Teachers generally don't handle attendance on this report form.
     // If they do, a check for editable class would be needed.

    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.max(numValue, 0);
    setAttendanceData(prev => prev.map((month, idx) => 
        idx === monthIndex ? { ...month, [type]: validatedValue } : month
    ));
  };

   const isSubjectEditableForTeacher = (subjectName: string): boolean => {
    if (currentUserRole === 'teacher') {
      // For "Science" on the back, allow edit if teacher teaches Physics or Biology which map to Science FA.
      if (subjectName === "Science" && (editableSubjects.includes("Physics") || editableSubjects.includes("Biology"))) return true;
      return editableSubjects.includes(subjectName);
    }
    return false; // Not a teacher, or no editable subjects
  };

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
      teacherEditableSubjects, // For teacher role, if they use this page
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
      generatedByAdminId: authUser._id.toString(), // Assuming admin is saving
      term: "Annual", // Example, can be made dynamic if needed
    };

    const result = await saveReportCard(reportPayload);
    setIsSaving(false);

    if (result.success) {
      toast({ title: "Report Card Saved", description: result.message + (result.reportCardId ? ` ID: ${result.reportCardId}` : '') });
    } else {
      toast({ variant: "destructive", title: "Save Failed", description: result.error || result.message });
    }
  };

  const currentUserRole = authUser?.role as UserRole;

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
            Enter Student's Admission ID to load data.
            {authUser?.role === 'admin' && " You can view and save the report card. Marks entry is done by teachers."}
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
             <Button onClick={handleLoadStudentAndClassData} disabled={isLoadingStudentAndClassData || isSaving || !admissionIdInput.trim() || !authUser || !authUser.schoolId}>
                {isLoadingStudentAndClassData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchIcon className="mr-2 h-4 w-4"/>}
                Load Student & Class Data
            </Button>
            {authUser?.schoolId && 
              <div className="w-full sm:w-auto">
                <Label className="mb-1 flex items-center"><SchoolIconUI className="mr-2 h-4 w-4 text-muted-foreground"/>School ID (Auto)</Label>
                <Input value={authUser.schoolId.toString()} disabled className="w-full sm:min-w-[200px]" />
              </div>
            }
             <div className="w-full sm:w-auto">
              <Label htmlFor="academicYearInput" className="mb-1">Academic Year</Label>
              <Input
                id="academicYearInput"
                value={frontAcademicYear}
                onChange={e => setFrontAcademicYear(e.target.value)}
                placeholder="YYYY-YYYY"
                className="w-full sm:min-w-[150px]"
                disabled={isSaving || (currentUserRole === 'admin' && !!loadedStudent)} // Admin cannot change after load
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveReportCard} disabled={isSaving || !loadedStudent || isLoadingStudentAndClassData || currentUserRole === 'teacher'}>
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
              coMarks={coMarks} onCoMarksChange={handleCoMarksChange} // Kept for structure
              secondLanguage={frontSecondLanguage} onSecondLanguageChange={(val) => { if(currentUserRole !== 'admin' || !loadedStudent) setFrontSecondLanguage(val)}}
              academicYear={frontAcademicYear} onAcademicYearChange={(val) => {if(currentUserRole !== 'admin' || !loadedStudent) setFrontAcademicYear(val)}}
              currentUserRole={currentUserRole}
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
              currentUserRole={currentUserRole}
              editableSubjects={teacherEditableSubjects} // This prop needs to be passed to CBSEStateBack as well
            />
          </div>
        </>
      )}
      {!isLoadingStudentAndClassData && !loadedStudent && admissionIdInput && (
          <Card className="no-print border-destructive">
            <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive"/>
                <CardTitle className="text-destructive">Student Data Not Loaded</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Student data could not be loaded for Admission ID: <span className="font-semibold">{admissionIdInput}</span>.</p>
                <p className="mt-1">Please ensure the Admission ID is correct and the student is properly configured in the system (assigned to a class, etc.).</p>
            </CardContent>
          </Card>
      )}
       {!isLoadingStudentAndClassData && !admissionIdInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Enter an Admission ID and Academic Year, then click "Load Student & Class Data" to begin.</p>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

