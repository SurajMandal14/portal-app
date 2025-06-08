
"use client";

import React from 'react';

// Define interfaces for props and state
export interface StudentData {
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
}

export interface MarksEntry {
  tool1: number | null;
  tool2: number | null;
  tool3: number | null;
  tool4: number | null; // This is the 20M tool
}

export interface SubjectFAData {
  fa1: MarksEntry;
  fa2: MarksEntry;
  fa3: MarksEntry;
  fa4: MarksEntry;
}

export interface CoCurricularSAData {
  sa1Max: number | null;
  sa1Marks: number | null;
  sa2Max: number | null;
  sa2Marks: number | null;
  sa3Max: number | null;
  sa3Marks: number | null;
}

interface CBSEStateFrontProps {
  studentData: StudentData;
  onStudentDataChange: (field: keyof StudentData, value: string) => void;
  
  faMarks: SubjectFAData[];
  onFaMarksChange: (subjectIndex: number, faPeriod: keyof SubjectFAData, toolKey: keyof MarksEntry, value: string) => void;
  
  coMarks: CoCurricularSAData[];
  onCoMarksChange: (subjectIndex: number, saPeriod: 'sa1' | 'sa2' | 'sa3', type: 'Marks' | 'Max', value: string) => void;
  
  secondLanguage: 'Hindi' | 'Telugu';
  onSecondLanguageChange: (value: 'Hindi' | 'Telugu') => void;
  
  academicYear: string;
  onAcademicYearChange: (value: string) => void;
}

// Grade scales
const overallSubjectGradeScale = [ // For total out of 200M
  { min: 180, grade: 'A+' }, { min: 160, grade: 'A' }, // Adjusted based on typical 200M scales, previously A1
  { min: 140, grade: 'B+' }, { min: 120, grade: 'B' }, // Previously A2, B1
  { min: 100, grade: 'C+' }, { min: 80, grade: 'C' },  // Previously B2, C1
  { min: 60, grade: 'D' }, { min: 40, grade: 'E' },   // Previously C2, D1. D2 might be fail.
  { min: 0, grade: 'F' } // Fail or Needs Improvement. Previously D2
];

const faPeriodGradeScale = [ // For 50M - Main Subjects
  { min: 46, grade: 'A1' }, { min: 41, grade: 'A2' },
  { min: 36, grade: 'B1' }, { min: 31, grade: 'B2' },
  { min: 26, grade: 'C1' }, { min: 21, grade: 'C2' },
  { min: 18, grade: 'D1' }, { min: 0, grade: 'D2' } // D2 for 0-17
];
const faPeriodGradeScale2ndLang = [ // For 50M - Second Language
  { min: 45, grade: 'A1' }, { min: 40, grade: 'A2' },
  { min: 34, grade: 'B1' }, { min: 29, grade: 'B2' },
  { min: 23, grade: 'C1' }, { min: 18, grade: 'C2' },
  { min: 10, grade: 'D1' }, { min: 0, grade: 'D2' } // D2 for 0-9
];
const coCurricularGradeScale = [ // Percentage based
  { min: 85, grade: 'A+' }, { min: 71, grade: 'A' },
  { min: 56, grade: 'B' }, { min: 41, grade: 'C' },
  { min: 0, grade: 'D' }
];

const getGrade = (totalMarks: number, scale: { min: number; grade: string }[]): string => {
  for (let i = 0; i < scale.length; i++) {
    if (totalMarks >= scale[i].min) return scale[i].grade;
  }
  return scale[scale.length - 1]?.grade || 'N/A'; // Default to last grade or N/A
};

const mainSubjects = ["Telugu", "Hindi", "English", "Maths", "Phy. Science", "Biol. Science", "Social Studies"];
const coCurricularSubjects = ["Value Edn.", "Work Edn.", "Phy. Edn.", "Art. Edn."];


const CBSEStateFront: React.FC<CBSEStateFrontProps> = ({
  studentData,
  onStudentDataChange,
  faMarks,
  onFaMarksChange,
  coMarks,
  onCoMarksChange,
  secondLanguage,
  onSecondLanguageChange,
  academicYear,
  onAcademicYearChange
}) => {

  const calculateFaResults = React.useCallback((subjectIndex: number) => {
    const subjectData = faMarks[subjectIndex];
    // Ensure subjectData and its FA periods are defined, providing defaults if not
    if (!subjectData) {
        // This case should ideally not happen if faMarks is initialized correctly
        const defaultFaPeriod = { tool1: null, tool2: null, tool3: null, tool4: null };
        const defaultSubjectData = { fa1: defaultFaPeriod, fa2: defaultFaPeriod, fa3: defaultFaPeriod, fa4: defaultFaPeriod };
        return { 
            ...Object.fromEntries((['fa1', 'fa2', 'fa3', 'fa4'] as const).map(key => [key, { total: 0, grade: 'N/A' }])),
            overallTotal: 0, 
            overallGrade: 'N/A' 
        };
    }

    const results: Record<string, { total: number; grade: string }> & { overallTotal: number; overallGrade: string } = {
      overallTotal: 0,
      overallGrade: 'N/A',
    };
    let currentOverallTotal = 0;

    const subjectName = mainSubjects[subjectIndex];
    // Determine if current subject is the selected second language
    const isSecondLang = subjectName === secondLanguage;
    const currentFaPeriodGradeScale = isSecondLang ? faPeriodGradeScale2ndLang : faPeriodGradeScale;

    (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
      const periodMarks = subjectData[faPeriodKey] || { tool1: null, tool2: null, tool3: null, tool4: null}; // Default if undefined
      const periodTotal = (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
      currentOverallTotal += periodTotal;
      results[faPeriodKey] = {
        total: periodTotal,
        grade: getGrade(periodTotal, currentFaPeriodGradeScale),
      };
    });
    results.overallTotal = currentOverallTotal;
    results.overallGrade = getGrade(currentOverallTotal, overallSubjectGradeScale); // Using 200M scale
    return results;
  }, [faMarks, secondLanguage]);


  const calculateCoResults = React.useCallback((subjectIndex: number) => {
    const subjectData = coMarks[subjectIndex];
    if (!subjectData) return { grade: 'N/A'}; // Default if undefined

    let totalMarksObtained = 0;
    let totalMaxMarksPossible = 0;

    (['sa1', 'sa2', 'sa3'] as const).forEach(saPeriodKey => {
      totalMarksObtained += subjectData[`${saPeriodKey}Marks`] || 0;
      totalMaxMarksPossible += subjectData[`${saPeriodKey}Max`] || 50; // Default max if null
    });
    
    const percentage = totalMaxMarksPossible > 0 ? (totalMarksObtained / totalMaxMarksPossible) * 100 : 0;
    return {
      grade: getGrade(percentage, coCurricularGradeScale)
    };
  }, [coMarks]);


  return (
    <>
      <style jsx global>{`
        .report-card-container body, .report-card-container { /* Apply to container too */
          font-family: Arial, sans-serif;
          font-size: 11px; /* Adjusted for potentially more content */
          margin: 0; /* Remove margin for better print control by parent */
          padding: 5px; /* Minimal padding, parent can control more */
          color: #000;
          background-color: #fff;
        }
        .report-card-container table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 10px; /* Reduced margin */
        }
        .report-card-container th, .report-card-container td {
          border: 1px solid #000;
          padding: 3px; /* Reduced padding */
          text-align: center;
          vertical-align: middle; /* Ensure vertical alignment */
        }
        .report-card-container .header-table td {
          border: none;
          text-align: left;
          padding: 1px 3px; /* Consistent padding */
        }
        .report-card-container .title {
          text-align: center;
          font-weight: bold;
          font-size: 14px; /* Adjusted */
          margin-bottom: 3px; /* Spacing */
        }
        .report-card-container .subtitle {
          text-align: center;
          font-weight: bold;
          font-size: 12px; /* Adjusted */
          margin-bottom: 8px; /* Spacing */
        }
        .report-card-container .small-note {
          font-size: 9px; /* Adjusted */
          margin-top: 8px; /* Spacing for note */
          text-align: left;
        }
        .report-card-container input[type="text"], 
        .report-card-container input[type="number"], 
        .report-card-container select {
          padding: 2px; /* Reduced padding */
          border: 1px solid #ccc;
          border-radius: 2px; /* Smaller radius */
          font-size: 11px; /* Match body font size */
          box-sizing: border-box; 
          background-color: #fff; /* Ensure background for inputs */
          color: #000; /* Ensure text color for inputs */
        }
        .report-card-container input[type="number"] {
          width: 45px; /* Default width for number inputs */
          text-align: center;
          -moz-appearance: textfield; /* Firefox */
        }
        .report-card-container input::-webkit-outer-spin-button,
        .report-card-container input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .report-card-container .header-table input[type="text"] { 
            width: 95%; /* Make them fill the cell by default */
            max-width: 180px; 
        }
         .report-card-container .header-table td:first-child input[type="text"] { 
            max-width: 300px; 
        }
        .report-card-container #fa-table input[type="number"]{ 
            width: 40px; 
        }
         .report-card-container .header-table select {
            min-width: 90px;
            padding: 2px;
        }
        .report-card-container .academic-year-input {
            font-weight: bold;
            font-size: 14px; /* Match title */
            border: none;
            text-align: center;
            width: 100px; /* Adjust as needed */
            display: inline-block; /* For better alignment */
            vertical-align: baseline;
        }
      `}</style>
      <div className="report-card-container">
        <div className="title">STUDENT ACADEMIC PERFORMANCE REPORT - 
            <input 
              type="text" 
              className="academic-year-input"
              value={academicYear} 
              onChange={e => onAcademicYearChange(e.target.value)}
              placeholder="20XX-20YY"
            />
        </div>
        <div className="subtitle">CBSE STATE</div>

        <table className="header-table">
          <tbody>
            <tr>
              <td colSpan={4}>U-DISE Code & School Name : <input type="text" value={studentData.udiseCodeSchoolName || ""} onChange={e => onStudentDataChange('udiseCodeSchoolName', e.target.value)} /></td>
            </tr>
            <tr>
              <td>Student Name: <input type="text" value={studentData.studentName || ""} onChange={e => onStudentDataChange('studentName', e.target.value)} /></td>
              <td>Father Name: <input type="text" value={studentData.fatherName || ""} onChange={e => onStudentDataChange('fatherName', e.target.value)} /></td>
              <td>Mother Name: <input type="text" value={studentData.motherName || ""} onChange={e => onStudentDataChange('motherName', e.target.value)} /></td>
               <td>Roll No: <input type="text" value={studentData.rollNo || ""} onChange={e => onStudentDataChange('rollNo', e.target.value)} /></td>
            </tr>
            <tr>
              <td>Class: <input type="text" value={studentData.class || ""} onChange={e => onStudentDataChange('class', e.target.value)}/></td>
              <td>Section: <input type="text" value={studentData.section || ""} onChange={e => onStudentDataChange('section', e.target.value)} /></td>
              <td>Student ID No: <input type="text" value={studentData.studentIdNo || ""} onChange={e => onStudentDataChange('studentIdNo', e.target.value)} /></td>
              <td>Admn. No: <input type="text" value={studentData.admissionNo || ""} onChange={e => onStudentDataChange('admissionNo', e.target.value)} /></td>
            </tr>
            <tr>
              <td>Medium: <input type="text" value={studentData.medium || ""} onChange={e => onStudentDataChange('medium', e.target.value)} /></td>
              <td>Date of Birth: <input type="text" value={studentData.dob || ""} onChange={e => onStudentDataChange('dob', e.target.value)} /></td>
              <td>Exam No: <input type="text" value={studentData.examNo || ""} onChange={e => onStudentDataChange('examNo', e.target.value)} /></td>
               <td>Aadhar No: <input type="text" value={studentData.aadharNo || ""} onChange={e => onStudentDataChange('aadharNo', e.target.value)} /></td>
            </tr>
            <tr>
              <td colSpan={4}>
                Second Language:
                <select value={secondLanguage} onChange={(e) => onSecondLanguageChange(e.target.value as 'Hindi' | 'Telugu')}>
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
              <th rowSpan={2}>TOTAL (200M)</th>
              <th rowSpan={2}>GRADE</th>
            </tr>
            <tr>
              <th>1</th><th>2</th><th>3</th><th>4(20M)</th><th>Total</th><th>Grade</th>
              <th>1</th><th>2</th><th>3</th><th>4(20M)</th><th>Total</th><th>Grade</th>
              <th>1</th><th>2</th><th>3</th><th>4(20M)</th><th>Total</th><th>Grade</th>
              <th>1</th><th>2</th><th>3</th><th>4(20M)</th><th>Total</th><th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {mainSubjects.map((subject, SIndex) => {
              const subjectFaData = faMarks[SIndex] || { 
                fa1: { tool1: null, tool2: null, tool3: null, tool4: null }, 
                fa2: { tool1: null, tool2: null, tool3: null, tool4: null }, 
                fa3: { tool1: null, tool2: null, tool3: null, tool4: null }, 
                fa4: { tool1: null, tool2: null, tool3: null, tool4: null }
              };
              const results = calculateFaResults(SIndex);
              return (
                <tr key={subject}>
                  <td>{SIndex + 1}</td>
                  <td style={{textAlign: 'left', paddingLeft: '5px'}}>{subject}</td>
                  {(['fa1', 'fa2', 'fa3', 'fa4'] as const).map(faPeriodKey => {
                     const periodData = subjectFaData[faPeriodKey] || { tool1: null, tool2: null, tool3: null, tool4: null};
                     return (
                        <React.Fragment key={faPeriodKey}>
                        {(['tool1', 'tool2', 'tool3', 'tool4'] as const).map(toolKey => (
                            <td key={toolKey}>
                            <input
                                type="number"
                                value={periodData[toolKey] ?? ''}
                                onChange={(e) => onFaMarksChange(SIndex, faPeriodKey, toolKey, e.target.value)}
                                max={toolKey === 'tool4' ? 20 : 10}
                                min="0"
                            />
                            </td>
                        ))}
                        <td>{results[faPeriodKey]?.total ?? ''}</td>
                        <td>{results[faPeriodKey]?.grade ?? ''}</td>
                        </React.Fragment>
                     );
                  })}
                  <td>{results.overallTotal}</td>
                  <td>{results.overallGrade}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small-note">
          Formative Assessment Tools: (1) Children Participation and Reflections, (2) Project work, (3) Written work, (4) Slip Test (20M)
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '15px' }}>
          <div style={{ flex: 3 }}>
            <div className="subtitle">Co-Curricular Subjects</div>
            <table id="co-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Sl. No</th>
                  <th rowSpan={2} style={{minWidth: '100px'}}>Subject</th>
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
                  const subjectCoData = coMarks[SIndex] || { sa1Max: 50, sa1Marks: null, sa2Max: 50, sa2Marks: null, sa3Max: 50, sa3Marks: null };
                  const coResults = calculateCoResults(SIndex);
                  return (
                  <tr key={subject}>
                    <td>{SIndex + 1}</td>
                    <td style={{textAlign: 'left', paddingLeft: '5px'}}>{subject}</td>
                    {(['sa1', 'sa2', 'sa3'] as const).map(saPeriodKey => (
                      <React.Fragment key={saPeriodKey}>
                        <td>
                          <input
                            type="number"
                            value={subjectCoData[`${saPeriodKey}Max`] ?? ''}
                            onChange={e => onCoMarksChange(SIndex, saPeriodKey, 'Max', e.target.value)}
                            min="1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={subjectCoData[`${saPeriodKey}Marks`] ?? ''}
                            onChange={e => onCoMarksChange(SIndex, saPeriodKey, 'Marks', e.target.value)}
                            max={subjectCoData[`${saPeriodKey}Max`] ?? undefined}
                            min="0"
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
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '10px' }}> {/* Adjusted flex */}
            <div>
              <table style={{fontSize: '9px'}}> {/* Adjusted font size */}
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
                    <tr key={`fa-grade-${g.grade}`}><td>{g.grade}</td><td>{g.min}-{i > 0 ? (faPeriodGradeScale[i-1]?.min ?? 51) -1 : 50}</td><td>{faPeriodGradeScale2ndLang[i].min}-{i > 0 ? (faPeriodGradeScale2ndLang[i-1]?.min ?? 51) -1 : 50}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <table style={{fontSize: '9px'}}>
                <caption><strong>Grades: Co-Curricular (% Based)</strong></caption>
                <thead>
                  <tr><th>Grade</th><th>% Marks</th></tr>
                </thead>
                <tbody>
                  {coCurricularGradeScale.map((g, i) => (
                    <tr key={`co-grade-${g.grade}`}><td>{g.grade}</td><td>{g.min}-{i > 0 ? (coCurricularGradeScale[i-1]?.min ?? 101) -1 : 100}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
             <div>
              <table style={{fontSize: '9px'}}>
                <caption><strong>Overall Subject Grade (200M)</strong></caption>
                <thead>
                  <tr><th>Grade</th><th>Marks</th></tr>
                </thead>
                <tbody>
                  {overallSubjectGradeScale.map((g, i) => (
                    <tr key={`overall-sub-grade-${g.grade}`}><td>{g.grade}</td><td>{g.min}-{i > 0 ? (overallSubjectGradeScale[i-1]?.min ?? 201) -1 : 200}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="small-note" style={{marginTop: '15px'}}>
            NOTE: In case of Science, Physical Science & Biological Science Teachers conduct & Record Formative Assessment Separately for 50 Marks each. Sum of FA1 to FA4 for Phy.Sci (200M) and Bio.Sci (200M) to be considered for respective rows on backside.
        </p>
      </div>
    </>
  );
};

export default CBSEStateFront;
