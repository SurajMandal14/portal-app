
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
} from '@/components/report-cards/CBSEStateBack';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, RotateCcw, Eye, EyeOff } from 'lucide-react';

// --- Defaults for Front Side ---
const mainSubjectsListFront = ["Telugu", "Hindi", "English", "Maths", "Phy. Science", "Biol. Science", "Social Studies"];
const coCurricularSubjectsListFront = ["Value Edn.", "Work Edn.", "Phy. Edn.", "Art. Edn."];

const getDefaultFaMarksEntryFront = (): FrontMarksEntry => ({ tool1: null, tool2: null, tool3: null, tool4: null });
const getDefaultSubjectFaDataFront = (): FrontSubjectFAData => ({
  fa1: getDefaultFaMarksEntryFront(), fa2: getDefaultFaMarksEntryFront(), fa3: getDefaultFaMarksEntryFront(), fa4: getDefaultFaMarksEntryFront(),
});
const getDefaultCoCurricularSaDataFront = (): FrontCoCurricularSAData => ({
  sa1Max: 50, sa1Marks: null, sa2Max: 50, sa2Marks: null, sa3Max: 50, sa3Marks: null,
});

const defaultStudentDataFront: FrontStudentData = {
  udiseCodeSchoolName: '1234567890 XYZ Public School',
  studentName: 'John Doe',
  fatherName: 'Richard Doe',
  motherName: 'Jane Doe',
  class: 'X',
  section: 'A',
  studentIdNo: 'S1001',
  rollNo: '101',
  medium: 'English',
  dob: '01/01/2008',
  admissionNo: 'A123',
  examNo: 'E1001',
  aadharNo: '1234 5678 9012',
};

const defaultFaMarksFront: FrontSubjectFAData[] = mainSubjectsListFront.map(() => getDefaultSubjectFaDataFront());
const defaultCoMarksFront: FrontCoCurricularSAData[] = coCurricularSubjectsListFront.map(() => getDefaultCoCurricularSaDataFront());


// --- Defaults for Back Side ---
const backSubjectStructure = [
  { subjectName: "Telugu", paper: "I" }, { subjectName: "Telugu", paper: "II" },
  { subjectName: "Hindi", paper: "I" },
  { subjectName: "English", paper: "I" }, { subjectName: "English", paper: "II" },
  { subjectName: "Maths", paper: "I" }, { subjectName: "Maths", paper: "II" },
  { subjectName: "Science", paper: "Physics" }, { subjectName: "Science", paper: "Biology" },
  { subjectName: "Social", paper: "I" }, { subjectName: "Social", paper: "II" },
];

const getDefaultSAPeriodMarksEntryBack = (): BackSAPeriodMarksEntry => ({
  as1: null, as2: null, as3: null, as4: null, as5: null, as6: null,
});

const defaultSaDataBack: BackSARowData[] = backSubjectStructure.map(s => ({
  subjectName: s.subjectName,
  paper: s.paper,
  sa1Marks: getDefaultSAPeriodMarksEntryBack(),
  sa2Marks: getDefaultSAPeriodMarksEntryBack(),
  faTotal200M: null, 
}));

const defaultAttendanceDataBack: BackAttendanceMonthData[] = Array(11).fill(null).map(() => ({ workingDays: null, presentDays: null }));


export default function GenerateCBSEStateReportPage() {
  // Front Side State
  const [studentData, setStudentData] = useState<FrontStudentData>(defaultStudentDataFront);
  const [faMarks, setFaMarks] = useState<FrontSubjectFAData[]>(defaultFaMarksFront);
  const [coMarks, setCoMarks] = useState<FrontCoCurricularSAData[]>(defaultCoMarksFront);
  const [frontSecondLanguage, setFrontSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');
  const [frontAcademicYear, setFrontAcademicYear] = useState<string>('2023-2024');

  // Back Side State
  const [saData, setSaData] = useState<BackSARowData[]>(defaultSaDataBack);
  const [attendanceData, setAttendanceData] = useState<BackAttendanceMonthData[]>(defaultAttendanceDataBack);
  const [finalOverallGradeInput, setFinalOverallGradeInput] = useState<string | null>(null);

  const [showBackSide, setShowBackSide] = useState(false);


  // Calculate FA Totals (out of 200M) from front-side data to pass to back-side
  const calculateFaTotal200MForRow = useCallback((subjectNameForBack: string, paperNameForBack: string): number | null => {
    let subjectIndexFront = -1;
    if (subjectNameForBack === "Science" && paperNameForBack === "Physics") {
        subjectIndexFront = mainSubjectsListFront.indexOf("Phy. Science");
    } else if (subjectNameForBack === "Science" && paperNameForBack === "Biology") {
        subjectIndexFront = mainSubjectsListFront.indexOf("Biol. Science");
    } else {
        subjectIndexFront = mainSubjectsListFront.indexOf(subjectNameForBack);
    }

    if (subjectIndexFront === -1 || !faMarks[subjectIndexFront]) return null;

    const subjectFaData = faMarks[subjectIndexFront];
    let overallTotal = 0;
    (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
      const periodMarks = subjectFaData[faPeriodKey];
      overallTotal += (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
    });
    return overallTotal;
  }, [faMarks]);

  // Update saData with calculated faTotal200M whenever faMarks changes
  useEffect(() => {
    setSaData(prevSaData => 
      prevSaData.map(row => ({
        ...row,
        faTotal200M: calculateFaTotal200MForRow(row.subjectName, row.paper)
      }))
    );
  }, [faMarks, calculateFaTotal200MForRow]);


  // --- Front Side Handlers ---
  const handleStudentDataChange = (field: keyof FrontStudentData, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaMarksChange = (subjectIndex: number, faPeriod: keyof FrontSubjectFAData, toolKey: keyof FrontMarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const maxMark = toolKey === 'tool4' ? 20 : 10; // Max for tool4 is 20, others 10
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), maxMark);
    
    setFaMarks(prev => {
      const newFaMarks = prev.map((subj, idx) => {
        if (idx === subjectIndex) {
          return {
            ...subj,
            [faPeriod]: {
              ...subj[faPeriod],
              [toolKey]: validatedValue,
            }
          };
        }
        return subj;
      });
      return newFaMarks;
    });
  };

  const handleCoMarksChange = (subjectIndex: number, saPeriod: 'sa1' | 'sa2' | 'sa3', type: 'Marks' | 'Max', value: string) => {
    const numValue = parseInt(value, 10);
    let validatedValue: number | null = isNaN(numValue) ? null : Math.max(numValue, 0);

    setCoMarks(prev => {
      const newCoMarks = prev.map((coSubj, idx) => {
        if (idx === subjectIndex) {
          const updatedSubj = { ...coSubj };
          const keyToUpdate = `${saPeriod}${type}` as keyof FrontCoCurricularSAData;
          
          if (type === 'Marks' && validatedValue !== null) {
            const maxKey = `${saPeriod}Max` as keyof FrontCoCurricularSAData;
            const currentMax = updatedSubj[maxKey] as number | null; // Explicitly cast
            if (currentMax !== null && validatedValue > currentMax) {
              validatedValue = currentMax;
            }
          }
          if (type === 'Max' && validatedValue !== null && validatedValue < 1) { // Max should be at least 1
            validatedValue = 1;
          }

          (updatedSubj[keyToUpdate] as number | null) = validatedValue; // Cast to allow assignment
          return updatedSubj;
        }
        return coSubj;
      });
      return newCoMarks;
    });
  };

  // --- Back Side Handlers ---
  const handleSaDataChange = (rowIndex: number, period: 'sa1' | 'sa2', asKey: keyof BackSAPeriodMarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), 20); // AS parts are max 20

    setSaData(prev => prev.map((row, idx) => {
      if (idx === rowIndex) {
        const updatedRow = { ...row };
        if (period === 'sa1') {
          updatedRow.sa1Marks = { ...updatedRow.sa1Marks, [asKey]: validatedValue };
        } else { // period === 'sa2'
          updatedRow.sa2Marks = { ...updatedRow.sa2Marks, [asKey]: validatedValue };
        }
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
      setFinalOverallGradeInput(value); // Usually this will be read-only and derived, but allow prop for now
  }

  const handleLogData = () => {
    console.log("Current Report Card Data (Front):", {
      studentData,
      faMarks,
      coMarks,
      frontSecondLanguage,
      frontAcademicYear
    });
    console.log("Current Report Card Data (Back):", {
      saData,
      attendanceData,
      finalOverallGradeInput
    });
    alert("Report data logged to console. Check developer tools.");
  };

  const handlePrint = () => {
    window.print();
  };
  
  const handleResetData = () => {
    setStudentData(defaultStudentDataFront);
    setFaMarks(mainSubjectsListFront.map(() => getDefaultSubjectFaDataFront()));
    setCoMarks(coCurricularSubjectsListFront.map(() => getDefaultCoCurricularSaDataFront()));
    setFrontSecondLanguage('Hindi');
    setFrontAcademicYear('2023-2024');

    setSaData(defaultSaDataBack.map(row => ({
        ...row,
        faTotal200M: calculateFaTotal200MForRow(row.subjectName, row.paper) // Recalculate based on reset front data
    })));
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
  }

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
            transform: scale(0.95); /* Optional: Adjust scale for printing */
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
            Fill in the details below to generate the report card. All calculations will update automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleLogData}>Log Current Report Data</Button>
            <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4"/> Print Report</Button>
            <Button onClick={() => setShowBackSide(prev => !prev)} variant="secondary">
                {showBackSide ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {showBackSide ? "View Front Side" : "View Back Side"}
            </Button>
            <Button onClick={handleResetData} variant="destructive" className="ml-auto"><RotateCcw className="mr-2 h-4 w-4"/> Reset All Data</Button>
        </CardContent>
      </Card>

      <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${showBackSide ? 'hidden' : ''}`}>
        <CBSEStateFront
          studentData={studentData}
          onStudentDataChange={handleStudentDataChange}
          faMarks={faMarks}
          onFaMarksChange={handleFaMarksChange}
          coMarks={coMarks}
          onCoMarksChange={handleCoMarksChange}
          secondLanguage={frontSecondLanguage}
          onSecondLanguageChange={setFrontSecondLanguage}
          academicYear={frontAcademicYear}
          onAcademicYearChange={setFrontAcademicYear}
        />
      </div>
      
      {/* This div helps ensure the back side starts on a new page when printing */}
      {/* <div className={`${!showBackSide ? 'hidden' : ''} page-break`}></div>  */}


      <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${!showBackSide ? 'hidden' : ''}`}>
        <CBSEStateBack
          saData={saData}
          onSaDataChange={handleSaDataChange}
          onFaTotalChange={handleFaTotalChangeBack}
          attendanceData={attendanceData}
          onAttendanceDataChange={handleAttendanceDataChange}
          finalOverallGradeInput={finalOverallGradeInput}
          onFinalOverallGradeInputChange={setFinalOverallGradeInput}
          secondLanguageSubjectName={frontSecondLanguage} 
        />
      </div>
    </div>
  );
}
