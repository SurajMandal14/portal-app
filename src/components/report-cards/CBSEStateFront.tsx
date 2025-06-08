
"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface StudentData {
  udiseCodeSchoolName?: string;
  studentName?: string;
  fatherName?: string;
  motherName?: string;
  class?: string;
  section?: string;
  studentIdNo?: string;
  rollNo?: string;
  medium?: string;
  dob?: string;
  admissionNo?: string;
  examNo?: string;
  aadharNo?: string;
  secondLanguageDefault?: 'Hindi' | 'Telugu';
}

interface MarksEntry {
  tool1: number | null;
  tool2: number | null;
  tool3: number | null;
  tool4: number | null; // This is the 20M tool
}

interface SubjectFAData {
  fa1: MarksEntry;
  fa2: MarksEntry;
  fa3: MarksEntry;
  fa4: MarksEntry;
}

interface CoCurricularSAData {
  sa1Max: number;
  sa1Marks: number | null;
  sa2Max: number;
  sa2Marks: number | null;
  sa3Max: number;
  sa3Marks: number | null;
}

interface CBSEStateFrontProps {
  studentData?: StudentData;
  initialFaMarks?: SubjectFAData[];
  initialCoMarks?: CoCurricularSAData[];
  academicYear?: string;
}

// Grade scales (defined outside component for clarity or can be inside)
const overallSubjectGradeScale = [ // For 200M total for a main subject
  { min: 180, grade: 'A+' }, { min: 160, grade: 'A1' }, // Note: A1 original script was 142 for 'A'
  { min: 140, grade: 'A2' }, // Made up A2 for finer grading, original script was less granular for 200M
  { min: 120, grade: 'B1' },
  { min: 100, grade: 'B2' },
  { min: 80, grade: 'C1' },
  { min: 60, grade: 'C2' },
  { min: 40, grade: 'D1' }, // Adjusted D1/D2 for 200M
  { min: 0, grade: 'D2' }
];

const faPeriodGradeScale = [ // For 50M FA Period (non-2nd language)
  { min: 46, grade: 'A1' }, { min: 41, grade: 'A2' },
  { min: 36, grade: 'B1' }, { min: 31, grade: 'B2' },
  { min: 26, grade: 'C1' }, { min: 21, grade: 'C2' },
  { min: 18, grade: 'D1' }, { min: 0, grade: 'D2' }
];
const faPeriodGradeScale2ndLang = [ // For 50M FA Period (2nd language)
  { min: 45, grade: 'A1' }, { min: 40, grade: 'A2' },
  { min: 34, grade: 'B1' }, { min: 29, grade: 'B2' },
  { min: 23, grade: 'C1' }, { min: 18, grade: 'C2' },
  { min: 10, grade: 'D1' }, { min: 0, grade: 'D2' }
];
const coCurricularGradeScale = [ // For co-curricular (percentage based on sum of SAs)
  { min: 85, grade: 'A+' }, { min: 71, grade: 'A' },
  { min: 56, grade: 'B' }, { min: 41, grade: 'C' },
  { min: 0, grade: 'D' }
];

const getGrade = (totalMarks: number, scale: { min: number; grade: string }[]): string => {
  for (let i = 0; i < scale.length; i++) {
    if (totalMarks >= scale[i].min) return scale[i].grade;
  }
  return scale[scale.length - 1]?.grade || 'N/A'; // Fallback
};


const CBSEStateFront: React.FC<CBSEStateFrontProps> = ({
  studentData: initialStudentData = {},
  initialFaMarks,
  initialCoMarks,
  academicYear = "20__ - 20__"
}) => {

  const [studentInfo, setStudentInfo] = useState<StudentData>(initialStudentData);
  const [secondLanguage, setSecondLanguage] = useState<'Hindi' | 'Telugu'>(initialStudentData.secondLanguageDefault || 'Hindi');

  const mainSubjects = ["Telugu", "Hindi", "English", "Maths", "Phy. Science", "Biol. Science", "Social Studies"];
  const coCurricularSubjects = ["Value Edn.", "Work Edn.", "Phy. Edn.", "Art. Edn."];

  const defaultFaMarksEntry = (): MarksEntry => ({ tool1: null, tool2: null, tool3: null, tool4: null });
  const defaultSubjectFaData = (): SubjectFAData => ({
    fa1: defaultFaMarksEntry(), fa2: defaultFaMarksEntry(), fa3: defaultFaMarksEntry(), fa4: defaultFaMarksEntry(),
  });

  const [faMarks, setFaMarks] = useState<SubjectFAData[]>(() =>
    initialFaMarks || mainSubjects.map(() => defaultSubjectFaData())
  );

  const defaultCoCurricularSaData = (): CoCurricularSAData => ({
    sa1Max: 50, sa1Marks: null, sa2Max: 50, sa2Marks: null, sa3Max: 50, sa3Marks: null, // Defaulting Max to 50 as per CCE pattern usually
  });

  const [coMarks, setCoMarks] = useState<CoCurricularSAData[]>(() =>
    initialCoMarks || coCurricularSubjects.map(() => defaultCoCurricularSaData())
  );

  const handleStudentInfoChange = (field: keyof StudentData, value: string) => {
    setStudentInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleFaInputChange = (subjectIndex: number, faPeriod: keyof SubjectFAData, toolKey: keyof MarksEntry, value: string) => {
    const numValue = parseInt(value, 10);
    const maxMark = toolKey === 'tool4' ? 20 : 10;
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), maxMark);

    setFaMarks(prev => {
      const newFaMarks = [...prev];
      newFaMarks[subjectIndex] = {
        ...newFaMarks[subjectIndex],
        [faPeriod]: {
          ...newFaMarks[subjectIndex][faPeriod],
          [toolKey]: validatedValue,
        }
      };
      return newFaMarks;
    });
  };
  
  const handleCoInputChange = (subjectIndex: number, saPeriod: 'sa1' | 'sa2' | 'sa3', type: 'Marks' | 'Max', value: string) => {
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.max(numValue, type === 'Max' ? 1 : 0); // Max marks should be at least 1

    setCoMarks(prev => {
      const newCoMarks = [...prev];
      const keyToUpdate = `${saPeriod}${type}` as keyof CoCurricularSAData;
      
      let finalValue = validatedValue;
      if (type === 'Marks' && validatedValue !== null) {
        const maxKey = `${saPeriod}Max` as keyof CoCurricularSAData;
        const currentMax = newCoMarks[subjectIndex][maxKey] as number | null;
        if (currentMax !== null && validatedValue > currentMax) {
          finalValue = currentMax; // Cap marks at max marks
        }
      }
      
      newCoMarks[subjectIndex] = {
        ...newCoMarks[subjectIndex],
        [keyToUpdate]: finalValue,
      };
      return newCoMarks;
    });
  };


  const calculateFaResults = useCallback((subjectIndex: number) => {
    const subjectData = faMarks[subjectIndex];
    const results: Record<string, { total: number; grade: string }> & { overallTotal: number; overallGrade: string } = {
      overallTotal: 0,
      overallGrade: 'N/A',
    };
    let currentOverallTotal = 0;

    const subjectName = mainSubjects[subjectIndex];
    const isSecondLang = subjectName === secondLanguage;
    const currentFaPeriodGradeScale = isSecondLang ? faPeriodGradeScale2ndLang : faPeriodGradeScale;

    (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
      const periodMarks = subjectData[faPeriodKey];
      const periodTotal = (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
      currentOverallTotal += periodTotal;
      results[faPeriodKey] = {
        total: periodTotal,
        grade: getGrade(periodTotal, currentFaPeriodGradeScale),
      };
    });
    results.overallTotal = currentOverallTotal;
    results.overallGrade = getGrade(currentOverallTotal, overallSubjectGradeScale);
    return results;
  }, [faMarks, secondLanguage, mainSubjects]);


  const calculateCoResults = useCallback((subjectIndex: number) => {
    const subjectData = coMarks[subjectIndex];
    let totalMarksObtained = 0;
    let totalMaxMarksPossible = 0;

    (['sa1', 'sa2', 'sa3'] as const).forEach(saPeriodKey => {
      totalMarksObtained += subjectData[`${saPeriodKey}Marks`] || 0;
      totalMaxMarksPossible += subjectData[`${saPeriodKey}Max`] || 0; // Default SA Max to 50 if not set
    });
    
    const percentage = totalMaxMarksPossible > 0 ? (totalMarksObtained / totalMaxMarksPossible) * 100 : 0;
    return {
      grade: getGrade(percentage, coCurricularGradeScale)
    };
  }, [coMarks]);


  return (
    <>
      <style jsx global>{`
        body.report-card-body { /*Scoped to a potential parent class if this is embedded */
          font-family: Arial, sans-serif;
          font-size: 12px;
          margin: 20px;
          color: #000;
          background-color: #fff; /* Ensure white background for printing */
        }
        .report-card-container table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 15px;
        }
        .report-card-container th, .report-card-container td {
          border: 1px solid #000;
          padding: 4px;
          text-align: center;
          vertical-align: middle;
        }
        .report-card-container .header-table td {
          border: none;
          text-align: left;
          padding: 2px 4px;
        }
        .report-card-container .title {
          text-align: center;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 5px;
        }
        .report-card-container .subtitle {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .report-card-container .small-note {
          font-size: 10px;
          margin-top: 10px;
        }
        .report-card-container input[type="text"], .report-card-container input[type="number"], .report-card-container select {
          padding: 3px;
          border: 1px solid #ccc;
          border-radius: 3px;
          font-size: 12px;
        }
        .report-card-container input[type="number"] {
          width: 55px;
          text-align: center;
        }
        .report-card-container .header-table input[type="text"] {
            width: 150px; /* Adjust as needed */
        }
        .report-card-container .header-table td:first-child input[type="text"] { /* For UDISE code */
            width: 300px;
        }
        .report-card-container #fa-table input[type="number"]{
            width: 45px;
        }
         .report-card-container .header-table select {
            min-width: 100px;
        }
      `}</style>
      <div className="report-card-container">
        <div className="title">STUDENT ACADEMIC PERFORMANCE REPORT - {academicYear}</div>
        <div className="subtitle">CBSE STATE</div>

        <table className="header-table">
          <tbody>
            <tr>
              <td colSpan={4}>U-DISE Code & School Name : <input type="text" value={studentInfo.udiseCodeSchoolName || ""} onChange={e => handleStudentInfoChange('udiseCodeSchoolName', e.target.value)} style={{width: "calc(100% - 200px)"}}/></td>
            </tr>
            <tr>
              <td>Student Name: <input type="text" value={studentInfo.studentName || ""} onChange={e => handleStudentInfoChange('studentName', e.target.value)} /></td>
              <td>Father Name: <input type="text" value={studentInfo.fatherName || ""} onChange={e => handleStudentInfoChange('fatherName', e.target.value)} /></td>
              <td>Mother Name: <input type="text" value={studentInfo.motherName || ""} onChange={e => handleStudentInfoChange('motherName', e.target.value)} /></td>
            </tr>
            <tr>
              <td>Class: <input type="text" value={studentInfo.class || ""} onChange={e => handleStudentInfoChange('class', e.target.value)} style={{width: "80px"}}/></td>
              <td>Section: <input type="text" value={studentInfo.section || ""} onChange={e => handleStudentInfoChange('section', e.target.value)} style={{width: "80px"}}/></td>
              <td>Student ID No: <input type="text" value={studentInfo.studentIdNo || ""} onChange={e => handleStudentInfoChange('studentIdNo', e.target.value)} /></td>
              <td>Roll No: <input type="text" value={studentInfo.rollNo || ""} onChange={e => handleStudentInfoChange('rollNo', e.target.value)} style={{width: "80px"}}/></td>
            </tr>
            <tr>
              <td>Medium: <input type="text" value={studentInfo.medium || ""} onChange={e => handleStudentInfoChange('medium', e.target.value)} style={{width: "80px"}}/></td>
              <td>Date of Birth: <input type="text" value={studentInfo.dob || ""} onChange={e => handleStudentInfoChange('dob', e.target.value)} /></td>
              <td>Admn. No: <input type="text" value={studentInfo.admissionNo || ""} onChange={e => handleStudentInfoChange('admissionNo', e.target.value)} /></td>
              <td>Exam No: <input type="text" value={studentInfo.examNo || ""} onChange={e => handleStudentInfoChange('examNo', e.target.value)} style={{width: "80px"}}/></td>
            </tr>
            <tr>
             <td colSpan={2}>Aadhar No: <input type="text" value={studentInfo.aadharNo || ""} onChange={e => handleStudentInfoChange('aadharNo', e.target.value)} style={{width: "200px"}} /></td>
              <td colSpan={2}>
                Second Language:
                <select value={secondLanguage} onChange={(e) => setSecondLanguage(e.target.value as 'Hindi' | 'Telugu')}>
                  <option value="Hindi">Hindi</option>
                  <option value="Telugu">Telugu</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="subtitle">Formative Assessment</div>
        <table id="fa-table">
          <thead>
            <tr>
              <th rowSpan={2}>Sl. No</th>
              <th rowSpan={2}>Subject</th>
              <th colSpan={6}>FA-1 (50M)</th>
              <th colSpan={6}>FA-2 (50M)</th>
              <th colSpan={6}>FA-3 (50M)</th>
              <th colSpan={6}>FA-4 (50M)</th>
              <th rowSpan={2}>TOTAL (200)</th>
              <th rowSpan={2}>GRADE</th>
            </tr>
            <tr>
              <th>1</th><th>2</th><th>3</th><th>4 (20M)</th><th>Total</th><th>Grade</th>
              <th>1</th><th>2</th><th>3</th><th>4 (20M)</th><th>Total</th><th>Grade</th>
              <th>1</th><th>2</th><th>3</th><th>4 (20M)</th><th>Total</th><th>Grade</th>
              <th>1</th><th>2</th><th>3</th><th>4 (20M)</th><th>Total</th><th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {mainSubjects.map((subject, SIndex) => {
              const results = calculateFaResults(SIndex);
              return (
                <tr key={subject}>
                  <td>{SIndex + 1}</td>
                  <td>{subject}</td>
                  {(['fa1', 'fa2', 'fa3', 'fa4'] as const).map(faPeriodKey => (
                    <React.Fragment key={faPeriodKey}>
                      {(['tool1', 'tool2', 'tool3', 'tool4'] as const).map(toolKey => (
                        <td key={toolKey}>
                          <input
                            type="number"
                            value={faMarks[SIndex]?.[faPeriodKey]?.[toolKey] ?? ''}
                            onChange={(e) => handleFaInputChange(SIndex, faPeriodKey, toolKey, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>{results[faPeriodKey]?.total ?? ''}</td>
                      <td>{results[faPeriodKey]?.grade ?? ''}</td>
                    </React.Fragment>
                  ))}
                  <td>{results.overallTotal}</td>
                  <td>{results.overallGrade}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small-note">
          Formative Assessment Tools: (1) Children Participation and Reflections, (2) Project work, (3) Written work, (4) Slip Test
        </p>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '20px' }}>
          <div style={{ flex: 3 }}>
            <div className="subtitle">Co-Curricular Subjects</div>
            <table id="co-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Sl. No</th>
                  <th rowSpan={2}>Subject</th>
                  <th colSpan={2}>SA-1</th>
                  <th colSpan={2}>SA-2</th>
                  <th colSpan={2}>SA-3</th>
                  <th rowSpan={2}>Overall Grade</th>
                </tr>
                <tr>
                  <th>Max. Marks</th><th>Marks Obt.</th>
                  <th>Max. Marks</th><th>Marks Obt.</th>
                  <th>Max. Marks</th><th>Marks Obt.</th>
                </tr>
              </thead>
              <tbody>
                {coCurricularSubjects.map((subject, SIndex) => {
                  const coResults = calculateCoResults(SIndex);
                  return (
                  <tr key={subject}>
                    <td>{SIndex + 1}</td>
                    <td>{subject}</td>
                    {(['sa1', 'sa2', 'sa3'] as const).map(saPeriodKey => (
                      <React.Fragment key={saPeriodKey}>
                        <td>
                          <input
                            type="number"
                            value={coMarks[SIndex]?.[`${saPeriodKey}Max`] ?? ''}
                            onChange={e => handleCoInputChange(SIndex, saPeriodKey, 'Max', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={coMarks[SIndex]?.[`${saPeriodKey}Marks`] ?? ''}
                            onChange={e => handleCoInputChange(SIndex, saPeriodKey, 'Marks', e.target.value)}
                            max={coMarks[SIndex]?.[`${saPeriodKey}Max`] ?? undefined}
                          />
                        </td>
                      </React.Fragment>
                    ))}
                    <td>{coResults.grade}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <table style={{fontSize: '10px'}}>
                <caption><strong>Grades: Curricular (FA - 50M)</strong></caption>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Marks (Excl. 2nd Lang)</th>
                    <th>Marks (2nd Lang)</th>
                  </tr>
                </thead>
                <tbody>
                  {faPeriodGradeScale.map((g, i) => (
                    <tr key={`fa-grade-${g.grade}`}><td>{g.grade}</td><td>{g.min}-{i > 0 ? faPeriodGradeScale[i-1].min -1 : 50}</td><td>{faPeriodGradeScale2ndLang[i].min}-{i > 0 ? faPeriodGradeScale2ndLang[i-1].min -1 : 50}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <table style={{fontSize: '10px'}}>
                <caption><strong>Grades: Co-Curricular</strong></caption>
                <thead>
                  <tr><th>Grade</th><th>% Marks</th></tr>
                </thead>
                <tbody>
                  {coCurricularGradeScale.map((g, i) => (
                    <tr key={`co-grade-${g.grade}`}><td>{g.grade}</td><td>{g.min}-{i > 0 ? coCurricularGradeScale[i-1].min -1 : 100}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="small-note" style={{marginTop: '15px'}}>
            NOTE: In case of Science, Physical Science & Biological Science Teachers conduct & Record Formative Assessment Separately for 50 Marks each. Finally add both P.S & B.S Marks and Reduce to 50 under Science Subject. (This reduction logic is not implemented in this interactive template and assumes combined science if applicable elsewhere).
        </p>
      </div>
    </>
  );
};

export default CBSEStateFront;

    