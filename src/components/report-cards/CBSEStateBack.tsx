
"use client";

import React from 'react';
import type { UserRole } from '@/types/user';

export interface SAPeriodMarksEntry {
  as1: number | null;
  as2: number | null;
  as3: number | null;
  as4: number | null;
  as5: number | null;
  as6: number | null;
}

export interface SARowData {
  subjectName: string;
  paper: string;
  sa1Marks: SAPeriodMarksEntry;
  sa2Marks: SAPeriodMarksEntry;
  faTotal200M: number | null; 
}

// For attendance
export interface AttendanceMonthData {
  workingDays: number | null;
  presentDays: number | null;
}

interface CBSEStateBackProps {
  saData: SARowData[];
  onSaDataChange: (rowIndex: number, period: 'sa1' | 'sa2', asKey: keyof SAPeriodMarksEntry, value: string) => void;
  onFaTotalChange: (rowIndex: number, value: string) => void; 
  
  attendanceData: AttendanceMonthData[];
  onAttendanceDataChange: (monthIndex: number, type: 'workingDays' | 'presentDays', value: string) => void;
  
  finalOverallGradeInput: string | null; 
  onFinalOverallGradeInputChange: (value: string) => void;

  secondLanguageSubjectName?: string; 

  currentUserRole: UserRole;
  editableSubjects?: string[];
}

// Grading Scales
const saGradeScale = (marks: number, _is100Scale: boolean, _isSecondLang: boolean) => { 
  if (marks >= 73) return 'A1';
  if (marks >= 65) return 'A2';
  if (marks >= 57) return 'B1';
  if (marks >= 49) return 'B2';
  if (marks >= 41) return 'C1';
  if (marks >= 33) return 'C2';
  if (marks >= 28) return 'D1';
  return 'D2';
};

const finalGradeScale = (marks: number, _isSecondLang: boolean) => { 
  if (marks >= 91) return 'A1';
  if (marks >= 81) return 'A2';
  if (marks >= 71) return 'B1';
  if (marks >= 61) return 'B2';
  if (marks >= 51) return 'C1';
  if (marks >= 41) return 'C2';
  if (marks >= 35) return 'D1';
  return 'D2';
};

// This structure defines the fixed rows and papers for the SA table.
const backSubjectStructure = [ 
  { name: "Telugu", papers: ["I", "II"] },
  { name: "Hindi", papers: ["I"] },
  { name: "English", papers: ["I", "II"] },
  { name: "Maths", papers: ["I", "II"] },
  { name: "Science", papers: ["Physics", "Biology"] }, 
  { name: "Social", papers: ["I", "II"] },
];

// Default SA data based on the fixed structure
export const defaultSaDataBack: SARowData[] = backSubjectStructure.flatMap(subjectInfo => 
  subjectInfo.papers.map(paperName => ({
    subjectName: subjectInfo.name,
    paper: paperName,
    sa1Marks: { as1: null, as2: null, as3: null, as4: null, as5: null, as6: null },
    sa2Marks: { as1: null, as2: null, as3: null, as4: null, as5: null, as6: null },
    faTotal200M: null,
  }))
);


const monthNames = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April"];

const CBSEStateBack: React.FC<CBSEStateBackProps> = ({
  saData,
  onSaDataChange,
  onFaTotalChange,
  attendanceData,
  onAttendanceDataChange,
  finalOverallGradeInput,
  onFinalOverallGradeInputChange,
  secondLanguageSubjectName,
  currentUserRole,
  editableSubjects = [],
}) => {

  const isTeacher = currentUserRole === 'teacher';
  const isStudent = currentUserRole === 'student';
  const isAdmin = currentUserRole === 'admin';

  const isSubjectEditableForTeacher = (subjectName: string): boolean => {
    if (isTeacher) {
      if ((subjectName === "Physics" || subjectName === "Biology") && editableSubjects.includes("Science")) return true;
      return editableSubjects.includes(subjectName);
    }
    return false; 
  };

  const calculateRowDerivedData = (rowData: SARowData, rowIndex: number) => {
    const isSecondLang = rowData.subjectName === secondLanguageSubjectName;

    const sumPeriodMarks = (periodMarks: SAPeriodMarksEntry) => 
      (periodMarks.as1 || 0) + (periodMarks.as2 || 0) + (periodMarks.as3 || 0) + 
      (periodMarks.as4 || 0) + (periodMarks.as5 || 0) + (periodMarks.as6 || 0);

    const sa1Total = sumPeriodMarks(rowData.sa1Marks);
    const sa1Grade = saGradeScale(sa1Total, false, isSecondLang);

    const sa2Total = sumPeriodMarks(rowData.sa2Marks);
    const sa2Grade = saGradeScale(sa2Total, false, isSecondLang);
    
    const faTotal200M_val = rowData.faTotal200M || 0;

    const sa1ForCalc = sa1Total > 80 ? 80 : sa1Total; 
    const sa2ForCalc = sa2Total > 80 ? 80 : sa2Total; 

    const faSa1Total = faTotal200M_val + sa1ForCalc; 
    
    const internalMarks = Math.round((faTotal200M_val + sa1ForCalc + sa2ForCalc) / 18);

    const finalTotal100M = internalMarks + sa2ForCalc; 
    const finalGrade = finalGradeScale(finalTotal100M, isSecondLang);
    
    return {
      sa1Total, sa1Grade,
      sa2Total, sa2Grade,
      faSa1Total, internalMarks,
      finalTotal100M, finalGrade
    };
  };
  
  const calculateOverallFinalGrade = () => {
    const allFinalGrades: string[] = [];
    saData.forEach((rowData, rowIndex) => {
      const derived = calculateRowDerivedData(rowData, rowIndex);
      if (derived.finalGrade) {
        allFinalGrades.push(derived.finalGrade);
      }
    });

    if (allFinalGrades.length === 0) return '';
    
    const gradeCounts: { [key: string]: number } = {};
    allFinalGrades.forEach(grade => {
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });

    let maxCount = 0;
    let mostFrequentGrade = '';
    for (const grade in gradeCounts) {
      if (gradeCounts[grade] > maxCount) {
        maxCount = gradeCounts[grade];
        mostFrequentGrade = grade;
      }
    }
    return mostFrequentGrade;
  };

  const totalWorkingDays = attendanceData.slice(0, 11).reduce((sum, month) => sum + (month.workingDays || 0), 0);
  const totalPresentDays = attendanceData.slice(0, 11).reduce((sum, month) => sum + (month.presentDays || 0), 0);
  const attendancePercentage = totalWorkingDays > 0 ? Math.round((totalPresentDays / totalWorkingDays) * 100) : 0;
  
  const isPageReadOnlyForAdmin = isAdmin && saData.some(row => row.faTotal200M !== null); // Check if any data loaded


  return (
    <>
      <style jsx global>{`
        .report-card-back-container body, .report-card-back-container {
          font-family: Arial, sans-serif;
          font-size: 10px; 
          padding: 10px; 
          color: #000;
          background-color: #fff;
        }
        .report-card-back-container table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 10px; 
        }
        .report-card-back-container th, .report-card-back-container td {
          border: 1px solid #000;
          text-align: center;
          padding: 2px; 
          height: 20px; 
        }
        .report-card-back-container th {
          background-color: #f0f0f0;
          font-size: 10px; 
        }
        .report-card-back-container td {
            font-size: 10px; 
        }
        .report-card-back-container .small {
          font-size: 8px; 
        }
        .report-card-back-container .bold {
          font-weight: bold;
        }
        .report-card-back-container .nowrap {
          white-space: nowrap;
        }
        .report-card-back-container input[type="number"], .report-card-back-container input[type="text"] {
          width: 35px; 
          text-align: center;
          border: 1px solid #ccc;
          font-size: 10px; 
          padding: 1px;
          box-sizing: border-box;
          -moz-appearance: textfield; 
        }
        .report-card-back-container input:disabled {
            background-color: #f0f0f0 !important;
            color: #555 !important;
            cursor: not-allowed;
            border: 1px solid #ddd !important;
        }
        .report-card-back-container input::-webkit-outer-spin-button,
        .report-card-back-container input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .report-card-back-container .calculated {
          background-color: #e9e9e9; 
          font-weight: bold;
        }
        .report-card-back-container h2 {
            font-size: 14px; 
        }
        .report-card-back-container .subject-cell {
            text-align: left;
            padding-left: 5px;
            font-weight: bold;
            vertical-align: middle;
        }
         .report-card-back-container .paper-cell {
            font-style: italic;
            vertical-align: middle;
        }
        .report-card-back-container .attendance-table input[type="number"] {
            width: 40px; 
        }
         .report-card-back-container .final-grade-input {
            width: 60px !important;
            font-weight: bold;
            border: 1px solid black !important;
         }
         .report-card-back-container .fatotal-input {
            width: 45px !important; 
         }
      `}</style>
      <div className="report-card-back-container">
        <h2 style={{ textAlign: 'center' }}>SUMMATIVE ASSESSMENT</h2>

        <table id="mainTable">
          <thead>
            <tr>
              <th rowSpan={3}>Subject</th>
              <th rowSpan={3}>Paper</th>
              <th colSpan={8}>Summative Assessment -1 (80 M)</th>
              <th colSpan={8}>Summative Assessment -2 (80 M)</th>
              <th colSpan={7}>Final Result (100 M)</th>
            </tr>
            <tr>
            </tr>
            <tr><th>AS 1</th><th>AS 2</th><th>AS 3</th><th>AS 4</th><th>AS 5</th><th>AS 6</th><th>TOTAL</th><th>GRADE</th>
              <th>AS 1</th><th>AS 2</th><th>AS 3</th><th>AS 4</th><th>AS 5</th><th>AS 6</th><th>TOTAL</th><th>GRADE</th>
              <th className="small">FA1-FA4<br />(200M)</th><th className="small">SA1<br />(80M)</th><th className="small">FA(Avg)+SA1<br />(100M)</th>
              <th className="small">Internal<br />(20M)</th><th className="small">SA2<br />(80M)</th><th className="small">TOTAL<br />(100M)</th><th>GRADE</th>
            </tr>
          </thead>
          <tbody>
            {saData.map((rowData, rowIndex) => {
                const derived = calculateRowDerivedData(rowData, rowIndex);
                const faTotal200M_display = rowData.faTotal200M ?? '';
                const isSaMarkInputDisabled = isStudent || isPageReadOnlyForAdmin || (isTeacher && !isSubjectEditableForTeacher(rowData.subjectName === "Science" ? "Science" : rowData.subjectName));
                
                const faAvg50 = (rowData.faTotal200M || 0) / 4;
                const sa1_50_for_avg = (derived.sa1Total > 80 ? 80 : derived.sa1Total) * (50/80);
                const faAvgPlusSa1_100M = Math.round(faAvg50 + sa1_50_for_avg);

                const isFirstPaperOfSubject = rowIndex === 0 || saData[rowIndex-1].subjectName !== rowData.subjectName;
                const subjectPaperCount = saData.filter(r => r.subjectName === rowData.subjectName).length;

                return (
                  <tr key={`${rowData.subjectName}-${rowData.paper}`}>
                    {isFirstPaperOfSubject && <td rowSpan={subjectPaperCount} className="subject-cell">{rowData.subjectName}</td>}
                    <td className="paper-cell">{rowData.paper}</td>
                    
                    {(Object.keys(rowData.sa1Marks) as Array<keyof SAPeriodMarksEntry>).map(asKey => (
                      <td key={`sa1-${asKey}`}><input type="number" value={rowData.sa1Marks[asKey] ?? ''} min="0" max="20" onChange={e => onSaDataChange(rowIndex, 'sa1', asKey, e.target.value)} disabled={isSaMarkInputDisabled} /></td>
                    ))}
                    <td className="sa1-total calculated">{derived.sa1Total}</td>
                    <td className="sa1-grade calculated">{derived.sa1Grade}</td>

                    {(Object.keys(rowData.sa2Marks) as Array<keyof SAPeriodMarksEntry>).map(asKey => (
                      <td key={`sa2-${asKey}`}><input type="number" value={rowData.sa2Marks[asKey] ?? ''} min="0" max="20" onChange={e => onSaDataChange(rowIndex, 'sa2', asKey, e.target.value)} disabled={isSaMarkInputDisabled} /></td>
                    ))}
                    <td className="sa2-total calculated">{derived.sa2Total}</td>
                    <td className="sa2-grade calculated">{derived.sa2Grade}</td>

                    <td><input type="number" className="fatotal-input" value={faTotal200M_display} min="0" max="200" onChange={e => onFaTotalChange(rowIndex, e.target.value)} disabled={isSaMarkInputDisabled} /></td>
                    <td className="calculated">{derived.sa1Total > 80 ? 80 : derived.sa1Total}</td>
                    <td className="calculated">{faAvgPlusSa1_100M}</td>
                    <td className="internal calculated">{derived.internalMarks}</td>
                    <td className="calculated">{derived.sa2Total > 80 ? 80 : derived.sa2Total}</td>
                    <td className="final-total calculated">{derived.finalTotal100M}</td>
                    <td className="final-grade calculated">{derived.finalGrade}</td>
                  </tr>
                );
            })}
          </tbody>
        </table>

        <p><strong>Final Grade in Curricular Areas:</strong> <input type="text" value={finalOverallGradeInput ?? calculateOverallFinalGrade()} onChange={e => onFinalOverallGradeInputChange(e.target.value)} className="final-grade-input calculated" readOnly={isStudent || isTeacher || isPageReadOnlyForAdmin} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin} /></p>
        <p className="small-note">*(Internal 20M) = FA-1, FA-2, FA-3, FA-4 (Total 200M), SA-1 (80M), SA-2 (80M). Grand Total 360M. Reduced to 20 Marks (360/18 = 20)</p>
        
        <table className="attendance-table">
          <thead>
            <tr><th colSpan={12}>ATTENDANCE REPORT</th><th rowSpan={2}>Total</th><th rowSpan={2}>%</th><th rowSpan={2}>Result</th></tr>
            <tr>
              <th>MONTH</th>
              {monthNames.map(month => <th key={month}>{month.substring(0,3)}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>No. of Working days</td>
              {attendanceData.slice(0,11).map((month, index) => (
                <td key={`wd-${index}`}><input type="number" value={month.workingDays ?? ''} onChange={e => onAttendanceDataChange(index, 'workingDays', e.target.value)} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin} /></td>
              ))}
              <td className="calculated">{totalWorkingDays}</td>
              <td rowSpan={2} className="calculated">{attendancePercentage}%</td>
              <td rowSpan={2}><input type="text" style={{width:'50px'}} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin}/></td>
            </tr>
            <tr>
              <td>No. of days present</td>
              {attendanceData.slice(0,11).map((month, index) => (
                <td key={`pd-${index}`}><input type="number" value={month.presentDays ?? ''} onChange={e => onAttendanceDataChange(index, 'presentDays', e.target.value)} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin}/></td>
              ))}
              <td className="calculated">{totalPresentDays}</td>
            </tr>
            <tr>
              <td>Sign. of Class Teacher</td><td colSpan={11}><input type="text" style={{width:'100%', textAlign:'left'}} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin} /></td><td></td><td></td><th>Final Grade</th>
            </tr>
             <tr>
              <td>Sign. of Headmaster</td><td colSpan={11}><input type="text" style={{width:'100%', textAlign:'left'}} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin} /></td><td></td><td></td><th>School Re Opening</th>
            </tr>
             <tr>
              <td>Sign. of Parent</td><td colSpan={11}><input type="text" style={{width:'100%', textAlign:'left'}} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin} /></td><td></td><td></td><td><input type="text" style={{width:'100%'}} disabled={isStudent || isTeacher || isPageReadOnlyForAdmin}/></td>
            </tr>
          </tbody>
        </table>

        <table className="grades-legend-table">
          <thead>
            <tr><th colSpan={6}>The Grade Point Average (GPA) will be calculated by taking arithmetic average of Grade Points</th></tr>
            <tr>
              <th rowSpan={2}>Grade</th>
              <th colSpan={2}>80 Marks Scale</th>
              <th colSpan={2}>100 Marks Scale</th>
              <th rowSpan={2}>Grade Points</th>
            </tr>
            <tr>
              <th>Marks (Excl. 2nd Lang)</th>
              <th>Marks (2nd Lang)</th>
              <th>Marks (Excl. 2nd Lang)</th>
              <th>Marks (2nd Lang)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>A1</td><td>73-80</td><td>72-80</td><td>91-100</td><td>90-100</td><td>10</td></tr>
            <tr><td>A2</td><td>65-72</td><td>63-71</td><td>81-90</td><td>79-89</td><td>9</td></tr>
            <tr><td>B1</td><td>57-64</td><td>54-62</td><td>71-80</td><td>68-78</td><td>8</td></tr>
            <tr><td>B2</td><td>49-56</td><td>46-53</td><td>61-70</td><td>57-67</td><td>7</td></tr>
            <tr><td>C1</td><td>41-48</td><td>37-40</td><td>51-60</td><td>46-56</td><td>6</td></tr>
            <tr><td>C2</td><td>33-40</td><td>28-36</td><td>41-50</td><td>35-45</td><td>5</td></tr>
            <tr><td>D1</td><td>28-32</td><td>16-27</td><td>35-40</td><td>20-34</td><td>4</td></tr>
            <tr><td>D2</td><td>00-27</td><td>00-15</td><td>00-34</td><td>00-19</td><td>-</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default CBSEStateBack;

