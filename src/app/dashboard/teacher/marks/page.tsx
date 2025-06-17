
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookCopy, Loader2, Save, Info, Filter } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser, User as AppUser } from "@/types/user";
import type { MarkEntry, StudentMarkInput, MarksSubmissionPayload } from "@/types/marks";
import { getSubjectsForTeacher, submitMarks, getMarksForAssessment, type SubjectForTeacher } from "@/app/actions/marks";
import { getStudentsByClass } from "@/app/actions/schoolUsers";

const ASSESSMENT_TYPES_NON_FA = ["Unit Test 1", "Unit Test 2", "Half Yearly", "Annual Exam", "SA1", "SA2"];
const FA_ASSESSMENTS = ["FA1", "FA2", "FA3", "FA4"];
const ALL_ASSESSMENT_TYPES = [...FA_ASSESSMENTS, ...ASSESSMENT_TYPES_NON_FA];

const TERMS = ["Term 1", "Term 2", "Term 3", "Annual"];

const FA_TOOLS = [
  { key: 'tool1', label: 'Tool 1', maxMarks: 10 },
  { key: 'tool2', label: 'Tool 2', maxMarks: 10 },
  { key: 'tool3', label: 'Tool 3', maxMarks: 10 },
  { key: 'tool4', label: 'Tool 4', maxMarks: 20 },
] as const;
type FaToolKey = (typeof FA_TOOLS)[number]['key'];

interface StudentMarksFAState {
  tool1: number | null;
  maxTool1: number;
  tool2: number | null;
  maxTool2: number;
  tool3: number | null;
  maxTool3: number;
  tool4: number | null;
  maxTool4: number;
}

interface StudentMarksNonFAState {
  marksObtained: number | null;
  maxMarks: number | null;
}

// Helper to determine current academic year string (e.g., "2023-2024")
const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0 (Jan) to 11 (Dec)
  const currentYear = today.getFullYear();
  if (currentMonth >= 5) { 
    return `${currentYear}-${currentYear + 1}`;
  } else { 
    return `${currentYear - 1}-${currentYear}`;
  }
};

export default function TeacherMarksEntryPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [availableSubjects, setAvailableSubjects] = useState<SubjectForTeacher[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectForTeacher | null>(null);
  
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>(TERMS[0]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  
  const [studentsForMarks, setStudentsForMarks] = useState<AppUser[]>([]);
  const [studentMarks, setStudentMarks] = useState<Record<string, StudentMarksFAState | StudentMarksNonFAState>>({});

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingStudentsAndMarks, setIsLoadingStudentsAndMarks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultMaxMarksNonFA, setDefaultMaxMarksNonFA] = useState<number>(50);

  const isCurrentAssessmentFA = FA_ASSESSMENTS.includes(selectedAssessment);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'teacher' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          if(parsedUser?.role !== 'teacher') toast({ variant: "destructive", title: "Access Denied" });
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }
  }, [toast]);

  const fetchSubjects = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoadingSubjects(false);
      return;
    }
    setIsLoadingSubjects(true);
    const subjectsResult = await getSubjectsForTeacher(authUser._id.toString(), authUser.schoolId.toString());
    if (subjectsResult.length > 0) {
      setAvailableSubjects(subjectsResult);
    } else {
      toast({ variant: "info", title: "No Subjects", description: "No subjects assigned to you for marks entry." });
      setAvailableSubjects([]);
    }
    setIsLoadingSubjects(false);
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser) fetchSubjects();
  }, [authUser, fetchSubjects]);

  const fetchStudentsAndMarks = useCallback(async () => {
    if (!selectedSubject || !selectedSubject.classId || !selectedAssessment || !selectedTerm || !selectedAcademicYear || !authUser?.schoolId) {
      setStudentsForMarks([]);
      setStudentMarks({});
      setIsLoadingStudentsAndMarks(false);
      return;
    }
    setIsLoadingStudentsAndMarks(true);
    try {
      const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), selectedSubject.classId);
      if (studentsResult.success && studentsResult.users) {
        setStudentsForMarks(studentsResult.users);

        // This action now handles fetching individual tool marks if assessmentName is FA type
        const marksResult = await getMarksForAssessment(
          authUser.schoolId.toString(),
          selectedSubject.classId,
          selectedSubject.subjectName,
          selectedAssessment, // Pass the base FA name like "FA1"
          selectedTerm,
          selectedAcademicYear
        );

        const initialMarks: Record<string, StudentMarksFAState | StudentMarksNonFAState> = {};
        
        if (isCurrentAssessmentFA) {
            studentsResult.users.forEach(student => {
                const studentIdStr = student._id!.toString();
                initialMarks[studentIdStr] = {
                    tool1: null, maxTool1: 10,
                    tool2: null, maxTool2: 10,
                    tool3: null, maxTool3: 10,
                    tool4: null, maxTool4: 20,
                };
            });
            if (marksResult.success && marksResult.marks) {
                 marksResult.marks.forEach(mark => {
                    const studentIdStr = mark.studentId.toString();
                    const assessmentNameParts = mark.assessmentName.split('-'); // e.g., "FA1-Tool1"
                    if (assessmentNameParts.length === 2) {
                        const faBaseName = assessmentNameParts[0]; // "FA1"
                        const toolKeyRaw = assessmentNameParts[1]; // "Tool1"
                        const toolKey = toolKeyRaw.toLowerCase().replace('tool', 'tool') as FaToolKey; // 'tool1'

                        if (faBaseName === selectedAssessment && initialMarks[studentIdStr] && toolKey in initialMarks[studentIdStr]!) {
                           (initialMarks[studentIdStr] as StudentMarksFAState)[toolKey] = mark.marksObtained;
                           (initialMarks[studentIdStr] as StudentMarksFAState)[`max${toolKey.charAt(0).toUpperCase() + toolKey.slice(1)}` as keyof StudentMarksFAState] = mark.maxMarks;
                        }
                    }
                });
            }
        } else { // Non-FA
            studentsResult.users.forEach(student => {
                initialMarks[student._id!.toString()] = {
                    marksObtained: null,
                    maxMarks: defaultMaxMarksNonFA,
                };
            });
            if (marksResult.success && marksResult.marks && marksResult.marks.length > 0) {
                 marksResult.marks.forEach(mark => {
                    const studentIdStr = mark.studentId.toString();
                    if (mark.assessmentName === selectedAssessment) {
                         initialMarks[studentIdStr] = {
                            marksObtained: mark.marksObtained,
                            maxMarks: mark.maxMarks,
                        };
                        // If loading existing non-FA marks, set defaultMaxMarksNonFA from the first one found.
                        if (marksResult.marks && marksResult.marks[0]) {
                            setDefaultMaxMarksNonFA(marksResult.marks[0].maxMarks);
                        }
                    }
                });
            }
        }
        setStudentMarks(initialMarks);

      } else {
        toast({ variant: "destructive", title: "Error", description: studentsResult.message || "Failed to load students."});
        setStudentsForMarks([]);
        setStudentMarks({});
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred fetching students or marks."});
      console.error("Error in fetchStudentsAndMarks:", error);
      setStudentsForMarks([]);
      setStudentMarks({});
    } finally {
      setIsLoadingStudentsAndMarks(false);
    }
  }, [authUser, selectedSubject, selectedAssessment, selectedTerm, selectedAcademicYear, toast, isCurrentAssessmentFA, defaultMaxMarksNonFA]);
  
  useEffect(() => {
    if (selectedSubject && selectedSubject.classId && selectedAssessment && selectedTerm && selectedAcademicYear) {
      fetchStudentsAndMarks();
    } else {
      setStudentsForMarks([]);
      setStudentMarks({});
    }
  }, [selectedSubject, selectedAssessment, selectedTerm, selectedAcademicYear, fetchStudentsAndMarks]);


  const handleSubjectChange = (value: string) => { 
    const subjectInfo = availableSubjects.find(s => s.value === value);
    setSelectedSubject(subjectInfo || null);
    setSelectedAssessment(""); 
    setStudentsForMarks([]);
    setStudentMarks({});
  };

  const handleMarksChange = (studentId: string, fieldOrToolKey: keyof StudentMarksNonFAState | FaToolKey, value: string, isMaxMarkField = false) => {
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : numValue;

    setStudentMarks(prev => {
      const currentStudentMarks = { ...(prev[studentId] || {}) };
      if (isCurrentAssessmentFA) {
        const faMarks = currentStudentMarks as StudentMarksFAState;
        const toolKey = fieldOrToolKey as FaToolKey;
        if (isMaxMarkField) {
            (faMarks[`max${toolKey.charAt(0).toUpperCase() + toolKey.slice(1)}` as keyof StudentMarksFAState] as number | null) = validatedValue;
        } else {
            faMarks[toolKey] = validatedValue;
        }
      } else {
        const nonFaMarks = currentStudentMarks as StudentMarksNonFAState;
        if (fieldOrToolKey === 'marksObtained') nonFaMarks.marksObtained = validatedValue;
        else if (fieldOrToolKey === 'maxMarks') nonFaMarks.maxMarks = validatedValue;
      }
      return { ...prev, [studentId]: currentStudentMarks };
    });
  };
  
  const handleDefaultMaxMarksNonFAChange = (value: string) => {
    const newMax = parseInt(value, 10);
    if (!isNaN(newMax) && newMax > 0) {
      setDefaultMaxMarksNonFA(newMax);
      if (!isCurrentAssessmentFA) {
        setStudentMarks(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
             const current = updated[studentId] as StudentMarksNonFAState;
             if (current.maxMarks === defaultMaxMarksNonFA || current.maxMarks === undefined || current.maxMarks === null) {
                current.maxMarks = newMax;
             }
          });
          return updated;
        });
      }
    } else if (value === "") {
        setDefaultMaxMarksNonFA(50); // Default back if cleared
    }
  };

  const handleSubmit = async () => {
    if (!authUser || !authUser._id || !authUser.schoolId || !selectedSubject || !selectedAssessment || !selectedTerm || !selectedAcademicYear || studentsForMarks.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select all fields and ensure students are loaded." });
      return;
    }
    setIsSubmitting(true);

    const marksToSubmit: StudentMarkInput[] = [];

    for (const student of studentsForMarks) {
      const studentIdStr = student._id!.toString();
      const currentStudentMarkState = studentMarks[studentIdStr];

      if (!currentStudentMarkState) continue;

      if (isCurrentAssessmentFA) {
        const faData = currentStudentMarkState as StudentMarksFAState;
        for (const tool of FA_TOOLS) {
          const marksObtained = faData[tool.key];
          const maxMarks = faData[`max${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}` as keyof StudentMarksFAState] as number; // e.g. maxTool1

          if (typeof marksObtained !== 'number' || marksObtained < 0) {
            toast({ variant: "destructive", title: "Invalid Marks", description: `Marks for ${student.name} (${tool.label}) cannot be negative or empty.`});
            setIsSubmitting(false); return;
          }
          if (maxMarks <= 0) {
            toast({ variant: "destructive", title: "Invalid Max Marks", description: `Max marks for ${student.name} (${tool.label}) must be positive.`});
            setIsSubmitting(false); return;
          }
          if (marksObtained > maxMarks) {
            toast({ variant: "destructive", title: "Marks Exceed Max", description: `Marks for ${student.name} (${tool.label}: ${marksObtained}) exceed max marks (${maxMarks}).`});
            setIsSubmitting(false); return;
          }
          marksToSubmit.push({
            studentId: studentIdStr,
            studentName: student.name || "N/A",
            marksObtained: marksObtained,
            maxMarks: maxMarks,
            // The assessmentName for DB will include the tool
            _internalAssessmentName: `${selectedAssessment}-${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}`, // e.g., FA1-Tool1
          });
        }
      } else { // Non-FA
        const nonFaData = currentStudentMarkState as StudentMarksNonFAState;
        const marksObtained = nonFaData.marksObtained;
        const maxMarks = nonFaData.maxMarks;

        if (typeof marksObtained !== 'number' || marksObtained < 0) {
            toast({ variant: "destructive", title: "Invalid Marks", description: `Marks for ${student.name} cannot be negative or empty.`});
            setIsSubmitting(false); return;
        }
        if (typeof maxMarks !== 'number' || maxMarks <= 0) {
            toast({ variant: "destructive", title: "Invalid Max Marks", description: `Max marks for ${student.name} must be positive.`});
            setIsSubmitting(false); return;
        }
        if (marksObtained > maxMarks) {
            toast({ variant: "destructive", title: "Marks Exceed Max", description: `Marks for ${student.name} (${marksObtained}) exceed max marks (${maxMarks}).`});
            setIsSubmitting(false); return;
        }
        marksToSubmit.push({
          studentId: studentIdStr,
          studentName: student.name || "N/A",
          marksObtained: marksObtained,
          maxMarks: maxMarks,
          _internalAssessmentName: selectedAssessment, // For non-FA, it's just the assessment name
        });
      }
    }
    
    if (marksToSubmit.length === 0 && studentsForMarks.length > 0) {
        toast({ variant: "info", title: "No Valid Marks to Submit", description: "No marks were entered or all entries are invalid." });
        setIsSubmitting(false);
        return;
    }
     if (marksToSubmit.length === 0 && studentsForMarks.length === 0) {
        toast({ variant: "info", title: "No Students", description: "No students loaded to submit marks for." });
        setIsSubmitting(false);
        return;
    }

    const payload: MarksSubmissionPayload = {
      classId: selectedSubject.classId,
      className: selectedSubject.className,
      subjectId: selectedSubject.subjectName, // Storing subject name as subjectId in marks collection
      subjectName: selectedSubject.subjectName,
      // assessmentName is now part of each StudentMarkInput via _internalAssessmentName
      // term, academicYear, markedByTeacherId, schoolId are top-level
      term: selectedTerm,
      academicYear: selectedAcademicYear,
      markedByTeacherId: authUser._id.toString(),
      schoolId: authUser.schoolId.toString(),
      studentMarks: marksToSubmit.map(m => ({ // Map to remove _internalAssessmentName before sending
          studentId: m.studentId,
          studentName: m.studentName,
          marksObtained: m.marksObtained,
          maxMarks: m.maxMarks,
          assessmentName: m._internalAssessmentName, // This is the key change for payload
      })),
    };
    
    // Remove the temporary _internalAssessmentName from the top-level payload.studentMarks and ensure assessmentName is set
    // The server action will read `assessmentName` from each item in `studentMarks` array.

    const result = await submitMarks(payload);
    if (result.success) {
      toast({ title: "Marks Submitted", description: result.message });
      fetchStudentsAndMarks(); 
    } else {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error || result.message });
    }
    setIsSubmitting(false);
  };


  if (!authUser) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>Please log in as a teacher to enter marks.</p></CardContent>
      </Card>
    );
  }

  const canLoadStudents = !!(selectedSubject && selectedSubject.classId && selectedAssessment && selectedTerm && selectedAcademicYear);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookCopy className="mr-2 h-6 w-6" /> Enter Student Marks
          </CardTitle>
          <CardDescription>
            Select the subject, assessment, term, and academic year to enter marks for students.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selection Criteria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="subject-select">Subject (Class)</Label>
            <Select onValueChange={handleSubjectChange} value={selectedSubject?.value || ""} disabled={isLoadingSubjects || availableSubjects.length === 0}>
              <SelectTrigger id="subject-select">
                <SelectValue placeholder={isLoadingSubjects ? "Loading subjects..." : (availableSubjects.length === 0 ? "No subjects assigned" : "Select subject")} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map(subject => (
                  <SelectItem key={subject.value} value={subject.value}>{subject.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="assessment-select">Assessment</Label>
            <Select onValueChange={setSelectedAssessment} value={selectedAssessment} disabled={!selectedSubject}>
              <SelectTrigger id="assessment-select"><SelectValue placeholder="Select assessment" /></SelectTrigger>
              <SelectContent>
                {ALL_ASSESSMENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="term-select">Term</Label>
            <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={!selectedSubject}>
              <SelectTrigger id="term-select"><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>
                {TERMS.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="academic-year-input">Academic Year</Label>
            <Input 
                id="academic-year-input"
                value={selectedAcademicYear} 
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                placeholder="e.g., 2023-2024"
                disabled={!selectedSubject}
            />
          </div>
           <div className="lg:col-start-4">
            <Button 
              onClick={fetchStudentsAndMarks} 
              disabled={isLoadingStudentsAndMarks || !canLoadStudents}
              className="w-full"
            >
              {isLoadingStudentsAndMarks ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Filter className="mr-2 h-4 w-4"/>}
              Load Students & Marks
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSubject && selectedAssessment && selectedTerm && selectedAcademicYear && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks for: {selectedSubject.label} - {selectedAssessment} - {selectedTerm} ({selectedAcademicYear})</CardTitle>
            {!isCurrentAssessmentFA && (
             <div className="mt-2">
                <Label htmlFor="default-max-marks">Default Max Marks for this Assessment</Label>
                <Input 
                    id="default-max-marks"
                    type="number" 
                    className="w-32"
                    value={defaultMaxMarksNonFA}
                    onChange={(e) => handleDefaultMaxMarksNonFAChange(e.target.value)}
                    disabled={isSubmitting || isLoadingStudentsAndMarks}
                />
                 <p className="text-xs text-muted-foreground mt-1">Set this before entering marks if it's different from individual entries.</p>
            </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingStudentsAndMarks ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>
            ) : studentsForMarks.length > 0 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission ID</TableHead>
                      {isCurrentAssessmentFA ? (
                        FA_TOOLS.map(tool => <TableHead key={tool.key} className="w-28 text-center">{tool.label} ({tool.maxMarks}M)</TableHead>)
                      ) : (
                        <>
                          <TableHead className="w-36 text-center">Marks Obtained</TableHead>
                          <TableHead className="w-32 text-center">Max Marks</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForMarks.map(student => {
                      const studentIdStr = student._id!.toString();
                      const currentMarksState = studentMarks[studentIdStr];
                      return (
                        <TableRow key={studentIdStr}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.admissionId || 'N/A'}</TableCell>
                          {isCurrentAssessmentFA ? (
                            FA_TOOLS.map(tool => {
                              const faData = currentMarksState as StudentMarksFAState;
                              const toolValue = faData ? faData[tool.key] : null;
                              const toolMax = faData ? faData[`max${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}` as keyof StudentMarksFAState] : tool.maxMarks;

                              return (
                                <TableCell key={tool.key} className="text-center">
                                  <Input
                                    type="number"
                                    value={toolValue ?? ""}
                                    onChange={e => handleMarksChange(studentIdStr, tool.key, e.target.value)}
                                    disabled={isSubmitting}
                                    max={toolMax as number}
                                    min="0"
                                    className="mx-auto"
                                  />
                                </TableCell>
                              );
                            })
                          ) : (
                            <>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  value={(currentMarksState as StudentMarksNonFAState)?.marksObtained ?? ""}
                                  onChange={e => handleMarksChange(studentIdStr, 'marksObtained', e.target.value)}
                                  disabled={isSubmitting}
                                  max={(currentMarksState as StudentMarksNonFAState)?.maxMarks ?? defaultMaxMarksNonFA}
                                  min="0"
                                  className="mx-auto"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  value={(currentMarksState as StudentMarksNonFAState)?.maxMarks ?? defaultMaxMarksNonFA}
                                  onChange={e => handleMarksChange(studentIdStr, 'maxMarks', e.target.value, true)}
                                  disabled={isSubmitting}
                                  min="1"
                                  className="mx-auto"
                                />
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={isSubmitting || isLoadingStudentsAndMarks || studentsForMarks.length === 0}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Submit All Marks
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {selectedSubject ? `No students found for class ${selectedSubject.className}.` : "Select criteria to load students."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
