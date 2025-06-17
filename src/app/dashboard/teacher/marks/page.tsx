
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

const ASSESSMENT_TYPES = ["FA1", "FA2", "FA3", "FA4", "SA1", "SA2", "Unit Test 1", "Unit Test 2", "Half Yearly", "Annual Exam"];
const TERMS = ["Term 1", "Term 2", "Term 3", "Annual"];

// Helper to determine current academic year string (e.g., "2023-2024")
const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0 (Jan) to 11 (Dec)
  const currentYear = today.getFullYear();
  // Assuming academic year starts in June (month 5)
  if (currentMonth >= 5) { 
    return `${currentYear}-${currentYear + 1}`;
  } else { 
    return `${currentYear - 1}-${currentYear}`;
  }
};

interface MarkInputWithStudentName extends StudentMarkInput {
  studentName: string; 
}


export default function TeacherMarksEntryPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [availableSubjects, setAvailableSubjects] = useState<SubjectForTeacher[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectForTeacher | null>(null);
  
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>(TERMS[0]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  
  const [studentsForMarks, setStudentsForMarks] = useState<AppUser[]>([]);
  const [studentMarks, setStudentMarks] = useState<Record<string, StudentMarkInput>>({}); // studentId -> MarkInput

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingStudentsAndMarks, setIsLoadingStudentsAndMarks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultMaxMarks, setDefaultMaxMarks] = useState<number>(50);


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
    if (!selectedSubject || !selectedAssessment || !selectedTerm || !selectedAcademicYear || !authUser?.schoolId) {
      setStudentsForMarks([]);
      setStudentMarks({});
      setIsLoadingStudentsAndMarks(false);
      return;
    }
    setIsLoadingStudentsAndMarks(true);
    try {
      const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), selectedSubject.className);
      if (studentsResult.success && studentsResult.users) {
        setStudentsForMarks(studentsResult.users);

        const marksResult = await getMarksForAssessment(
          authUser.schoolId.toString(),
          selectedSubject.classId,
          selectedSubject.subjectName,
          selectedAssessment,
          selectedTerm,
          selectedAcademicYear
        );

        const initialMarks: Record<string, StudentMarkInput> = {};
        if (marksResult.success && marksResult.marks) {
          marksResult.marks.forEach(mark => {
            initialMarks[mark.studentId.toString()] = {
              studentId: mark.studentId.toString(),
              marksObtained: mark.marksObtained,
              maxMarks: mark.maxMarks,
              studentName: mark.studentName, // Already there in MarkEntry
            };
          });
           if (marksResult.marks.length > 0 && marksResult.marks[0]) {
             setDefaultMaxMarks(marksResult.marks[0].maxMarks);
           }
        }
        // Initialize for students not in marksResult
        studentsResult.users.forEach(student => {
          if (student._id && !initialMarks[student._id.toString()]) {
            initialMarks[student._id.toString()] = {
              studentId: student._id.toString(),
              studentName: student.name || "N/A",
              marksObtained: 0, // Default to 0 or null
              maxMarks: defaultMaxMarks, 
            };
          }
        });
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
  }, [authUser, selectedSubject, selectedAssessment, selectedTerm, selectedAcademicYear, toast, defaultMaxMarks]);
  
  useEffect(() => {
    // Trigger fetch when selections change
    if (selectedSubject && selectedAssessment && selectedTerm && selectedAcademicYear) {
      fetchStudentsAndMarks();
    } else {
      // Clear students and marks if selections are incomplete
      setStudentsForMarks([]);
      setStudentMarks({});
    }
  }, [selectedSubject, selectedAssessment, selectedTerm, selectedAcademicYear, fetchStudentsAndMarks]);


  const handleSubjectChange = (value: string) => { // value is the composite "classId_subjectName"
    const subjectInfo = availableSubjects.find(s => s.value === value);
    setSelectedSubject(subjectInfo || null);
    // Reset dependent fields
    setSelectedAssessment("");
    setStudentsForMarks([]);
    setStudentMarks({});
  };

  const handleMarksChange = (studentId: string, field: 'marksObtained' | 'maxMarks', value: string) => {
    const numValue = parseInt(value, 10);
    setStudentMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId: studentId, 
        studentName: prev[studentId]?.studentName || studentsForMarks.find(s=>s._id === studentId)?.name || 'N/A',
        [field]: isNaN(numValue) ? (field === 'marksObtained' ? 0 : defaultMaxMarks) : numValue,
        ...(field === 'maxMarks' && { maxMarks: isNaN(numValue) ? defaultMaxMarks : numValue }), // Ensure maxMarks is always set
        ...(field === 'marksObtained' && { marksObtained: isNaN(numValue) ? 0 : numValue })

      }
    }));
  };
  
  const handleDefaultMaxMarksChange = (value: string) => {
    const newMax = parseInt(value, 10);
    if (!isNaN(newMax) && newMax > 0) {
      setDefaultMaxMarks(newMax);
      // Update maxMarks for all students if they haven't been individually set
      setStudentMarks(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(studentId => {
          // Check if maxMarks was at default or not individually set
          // This logic might need refinement based on how you want to handle existing entries
          if (updated[studentId].maxMarks === defaultMaxMarks || !updated[studentId].maxMarks) { 
            updated[studentId].maxMarks = newMax;
          }
        });
        return updated;
      });
    } else if (value === "") {
        setDefaultMaxMarks(50); // Default back if cleared
    }
  };

  const handleSubmit = async () => {
    if (!authUser || !authUser._id || !authUser.schoolId || !selectedSubject || !selectedAssessment || !selectedTerm || !selectedAcademicYear || studentsForMarks.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select all fields and ensure students are loaded." });
      return;
    }
    setIsSubmitting(true);

    const marksToSubmit: StudentMarkInput[] = Object.values(studentMarks).filter(mark => {
      // Validate individual entries before submitting
      if (mark.marksObtained < 0) {
        toast({ variant: "destructive", title: "Invalid Marks", description: `Marks for ${mark.studentName} cannot be negative.`});
        return false;
      }
       if (mark.maxMarks <= 0) {
        toast({ variant: "destructive", title: "Invalid Max Marks", description: `Max marks for ${mark.studentName} must be positive.`});
        return false;
      }
      if (mark.marksObtained > mark.maxMarks) {
        toast({ variant: "destructive", title: "Marks Exceed Max", description: `Marks for ${mark.studentName} exceed max marks.`});
        return false;
      }
      return true;
    });

    if (marksToSubmit.length !== Object.values(studentMarks).length) {
        // This means some validation failed above and toast was shown
        setIsSubmitting(false);
        return;
    }
     if (marksToSubmit.length === 0 && studentsForMarks.length > 0) {
        toast({ variant: "info", title: "No Marks to Submit", description: "No marks were entered or all entries are invalid." });
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
      subjectId: selectedSubject.subjectName, // Using subject name as identifier
      subjectName: selectedSubject.subjectName,
      assessmentName: selectedAssessment,
      term: selectedTerm,
      academicYear: selectedAcademicYear,
      markedByTeacherId: authUser._id.toString(),
      schoolId: authUser.schoolId.toString(),
      studentMarks: marksToSubmit,
    };

    const result = await submitMarks(payload);
    if (result.success) {
      toast({ title: "Marks Submitted", description: result.message });
      fetchStudentsAndMarks(); // Refresh marks
    } else {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error || result.message });
    }
    setIsSubmitting(false);
  };


  if (!authUser) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in as a teacher to enter marks.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookCopy className="mr-2 h-6 w-6" /> Enter Student Marks
          </CardTitle>
          <CardDescription>
            Select the subject, assessment, term, and academic year to enter marks for students.
            Your School ID: {authUser.schoolId || 'N/A'}. Teacher ID: {authUser._id?.toString().substring(0,8) || 'N/A'}...
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
                {ASSESSMENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
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
              disabled={isLoadingStudentsAndMarks || !selectedSubject || !selectedAssessment || !selectedTerm || !selectedAcademicYear}
              className="w-full"
            >
              {isLoadingStudentsAndMarks ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Filter className="mr-2 h-4 w-4"/>}
              Load Students & Marks
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSubject && selectedAssessment && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks for: {selectedSubject.label} - {selectedAssessment} - {selectedTerm} ({selectedAcademicYear})</CardTitle>
             <div className="mt-2">
                <Label htmlFor="default-max-marks">Default Max Marks for this Assessment</Label>
                <Input 
                    id="default-max-marks"
                    type="number" 
                    className="w-32"
                    value={defaultMaxMarks}
                    onChange={(e) => handleDefaultMaxMarksChange(e.target.value)}
                    disabled={isSubmitting || isLoadingStudentsAndMarks}
                />
                 <p className="text-xs text-muted-foreground mt-1">Set this before entering marks if it's different from individual entries.</p>
            </div>
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
                      <TableHead className="w-36">Marks Obtained</TableHead>
                      <TableHead className="w-32">Max Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForMarks.map(student => {
                      const studentIdStr = student._id!.toString();
                      const currentMark = studentMarks[studentIdStr] || { studentId: studentIdStr, studentName: student.name || "N/A", marksObtained: 0, maxMarks: defaultMaxMarks };
                      return (
                        <TableRow key={studentIdStr}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.admissionId || 'N/A'}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={currentMark.marksObtained ?? ""}
                              onChange={e => handleMarksChange(studentIdStr, 'marksObtained', e.target.value)}
                              disabled={isSubmitting}
                              max={currentMark.maxMarks}
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={currentMark.maxMarks ?? ""}
                              onChange={e => handleMarksChange(studentIdStr, 'maxMarks', e.target.value)}
                              disabled={isSubmitting}
                              min="1"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={isSubmitting || isLoadingStudentsAndMarks}>
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
