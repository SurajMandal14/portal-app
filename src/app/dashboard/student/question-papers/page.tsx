
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Download, Loader2, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/user";
import type { QuestionPaper } from "@/types/questionPaper";
import { getQuestionPapersForStudent } from "@/app/actions/questionPapers";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

export default function StudentQuestionPapersPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [papers, setPapers] = useState<QuestionPaper[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser && storedUser !== 'undefined') {
            try {
                const parsedUser: AuthUser = JSON.parse(storedUser);
                if(parsedUser.role === 'student') {
                    setAuthUser(parsedUser);
                }
            } catch (e) { console.error(e); }
        }
    }, []);

    const fetchPapers = useCallback(async () => {
        if (!authUser || !authUser.classId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const result = await getQuestionPapersForStudent(authUser.classId);
        if (result.success && result.papers) {
            setPapers(result.papers);
        } else {
            toast({ variant: 'warning', title: "Could not load papers", description: result.message });
        }
        setIsLoading(false);
    }, [authUser, toast]);

    useEffect(() => {
        if (authUser) {
            fetchPapers();
        } else {
            setIsLoading(false);
        }
    }, [authUser, fetchPapers]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <FileQuestion className="mr-2 h-6 w-6" /> Previous Year Question Papers
          </CardTitle>
          <CardDescription>
            View and download question papers uploaded by your school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : !authUser ? (
            <div className="text-center py-6 text-muted-foreground">Please log in to view question papers.</div>
          ) : !authUser.classId ? (
            <div className="text-center py-6 text-muted-foreground">You are not assigned to a class. Question papers cannot be displayed.</div>
          ) : papers.length > 0 ? (
            <Table>
                <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Exam</TableHead><TableHead>Year</TableHead><TableHead>Uploaded On</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                    {papers.map(p => (
                        <TableRow key={p._id}>
                            <TableCell className="font-medium">{p.subjectName}</TableCell>
                            <TableCell>{p.examName}</TableCell>
                            <TableCell>{p.year}</TableCell>
                            <TableCell>{format(new Date(p.createdAt), "PP")}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm">
                                    <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4"/> Download PDF
                                    </a>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <Info className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">
                    No Question Papers Found
                </h3>
                <p className="text-muted-foreground">
                    There are no question papers available for your class yet.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
