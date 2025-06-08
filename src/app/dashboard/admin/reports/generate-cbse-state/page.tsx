
"use client";

import React, { useState } from 'react';
import CBSEStateFront, { 
    type StudentData, 
    type SubjectFAData, 
    type MarksEntry, 
    type CoCurricularSAData 
} from '@/components/report-cards/CBSEStateFront';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, RotateCcw } from 'lucide-react';

// Helper to initialize empty marks structures
const mainSubjectsList = ["Telugu", "Hindi", "English", "Maths", "Phy. Science", "Biol. Science", "Social Studies"];
const coCurricularSubjectsList = ["Value Edn.", "Work Edn.", "Phy. Edn.", "Art. Edn."];

const getDefaultFaMarksEntry = (): MarksEntry => ({ tool1: null, tool2: null, tool3: null, tool4: null });
const getDefaultSubjectFaData = (): SubjectFAData => ({
  fa1: getDefaultFaMarksEntry(), fa2: getDefaultFaMarksEntry(), fa3: getDefaultFaMarksEntry(), fa4: getDefaultFaMarksEntry(),
});
const getDefaultCoCurricularSaData = (): CoCurricularSAData => ({
  sa1Max: 50, sa1Marks: null, sa2Max: 50, sa2Marks: null, sa3Max: 50, sa3Marks: null,
});

const defaultStudentData: StudentData = {
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

const defaultFaMarks: SubjectFAData[] = mainSubjectsList.map(() => getDefaultSubjectFaData());
const defaultCoMarks: CoCurricularSAData[] = coCurricularSubjectsList.map(() => getDefaultCoCurricularSaData());


export default function GenerateCBSEStateReportPage() {
  const [studentData, setStudentData] = useState<StudentData>(defaultStudentData);
  const [faMarks, setFaMarks] = useState<SubjectFAData[]>(defaultFaMarks);
  const [coMarks, setCoMarks] = useState<CoCurricularSAData[]>(defaultCoMarks);
  const [secondLanguage, setSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');
  const [academicYear, setAcademicYear] = useState<string>('2023-2024');

  const handleStudentDataChange = (field: keyof StudentData, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaMarksChange = (subjectIndex: number, faPeriod: keyof SubjectFAData, toolKey: keyof MarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const maxMark = toolKey === 'tool4' ? 20 : 10;
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
          const keyToUpdate = `${saPeriod}${type}` as keyof CoCurricularSAData;
          
          if (type === 'Marks' && validatedValue !== null) {
            const maxKey = `${saPeriod}Max` as keyof CoCurricularSAData;
            const currentMax = updatedSubj[maxKey] as number | null;
            if (currentMax !== null && validatedValue > currentMax) {
              validatedValue = currentMax;
            }
          }
           // Ensure max is at least 1 if not null
          if (type === 'Max' && validatedValue !== null && validatedValue < 1) {
            validatedValue = 1;
          }

          (updatedSubj[keyToUpdate] as number | null) = validatedValue;
          return updatedSubj;
        }
        return coSubj;
      });
      return newCoMarks;
    });
  };

  const handleLogData = () => {
    console.log("Current Report Card Data:", {
      studentData,
      faMarks,
      coMarks,
      secondLanguage,
      academicYear
    });
    alert("Report data logged to console. Check developer tools.");
  };

  const handlePrint = () => {
    window.print();
  };
  
  const handleResetData = () => {
    setStudentData(defaultStudentData);
    setFaMarks(mainSubjectsList.map(() => getDefaultSubjectFaData()));
    setCoMarks(coCurricularSubjectsList.map(() => getDefaultCoCurricularSaData()));
    setSecondLanguage('Hindi');
    setAcademicYear('2023-2024');
  }

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report-card, .printable-report-card * { visibility: visible; }
          .printable-report-card { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
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
            <Button onClick={handleLogData}>Log Current Report Data (Console)</Button>
            <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4"/> Print Report Card</Button>
            <Button onClick={handleResetData} variant="destructive" className="ml-auto"><RotateCcw className="mr-2 h-4 w-4"/> Reset All Data</Button>
        </CardContent>
      </Card>

      <div className="printable-report-card bg-white p-4 sm:p-6 rounded-lg shadow-md"> {/* Added shadow and rounded for non-print view */}
        <CBSEStateFront
          studentData={studentData}
          onStudentDataChange={handleStudentDataChange}
          faMarks={faMarks}
          onFaMarksChange={handleFaMarksChange}
          coMarks={coMarks}
          onCoMarksChange={handleCoMarksChange}
          secondLanguage={secondLanguage}
          onSecondLanguageChange={setSecondLanguage}
          academicYear={academicYear}
          onAcademicYearChange={setAcademicYear}
        />
      </div>
    </div>
  );
}
