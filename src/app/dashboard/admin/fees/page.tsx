
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Printer, Search, Filter, Loader2, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/attendance";
import type { User as AppUser } from "@/types/user";
import type { School, ClassFeeConfig } from "@/types/school";
import { getSchoolUsers } from "@/app/actions/schoolUsers";
import { getSchoolById } from "@/app/actions/schools";

interface StudentFeeDetails extends AppUser {
  totalFee: number;
  paidAmount: number; // For future use
  dueAmount: number; // For future use
  className?: string; // From user.classId
}

export default function FeeManagementPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [studentFeeList, setStudentFeeList] = useState<StudentFeeDetails[]>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin." });
        }
      } catch (e) {
        console.error("FeeManagementPage: Failed to parse authUser", e);
        setAuthUser(null);
      }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const calculateTotalFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig) return 0;
    const classFeeConfig = schoolConfig.classFees.find(cf => cf.className === className);
    if (!classFeeConfig) return 0;
    return (classFeeConfig.tuitionFee || 0) + (classFeeConfig.busFee || 0) + (classFeeConfig.canteenFee || 0);
  }, []);

  const fetchSchoolData = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [schoolResult, usersResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString())
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
      }

      if (usersResult.success && usersResult.users) {
        const studentUsers = usersResult.users.filter(u => u.role === 'student');
        setStudents(studentUsers);
        
        // Process student fee list after both schoolDetails and students are set
        // This might require schoolDetails to be available, so we use a conditional effect or handle it here
        if (schoolResult.success && schoolResult.school) {
            const processedFeeList = studentUsers.map(student => {
            const totalFee = calculateTotalFee(student.classId as string, schoolResult.school);
            return {
                ...student,
                className: student.classId as string, // classId stores className
                totalFee: totalFee,
                paidAmount: 0, // Placeholder
                dueAmount: totalFee, // Placeholder
            };
            }) as StudentFeeDetails[];
           setStudentFeeList(processedFeeList);
        }


      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load students." });
        setStudents([]);
        setStudentFeeList([]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred fetching school data." });
      setSchoolDetails(null);
      setStudents([]);
      setStudentFeeList([]);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast, calculateTotalFee]);

  useEffect(() => {
    if (authUser && authUser.schoolId) {
      fetchSchoolData();
    } else {
      setIsLoading(false); // Not logged in or no schoolId
      setSchoolDetails(null);
      setStudents([]);
      setStudentFeeList([]);
    }
  }, [authUser, fetchSchoolData]);
  

  const selectedStudentData = selectedStudentId ? studentFeeList.find(s => s._id.toString() === selectedStudentId) : null;

  useEffect(() => {
    if (selectedStudentData) {
      setPaymentAmount(selectedStudentData.dueAmount > 0 ? selectedStudentData.dueAmount : "");
    } else {
      setPaymentAmount("");
    }
  }, [selectedStudentId, selectedStudentData]);

  const handleRecordPayment = () => {
    if (!selectedStudentData || !paymentAmount || +paymentAmount <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a student and enter a valid payment amount." });
      return;
    }
    // TODO: Implement actual payment recording logic (new server action)
    console.log(`Recording payment for ${selectedStudentData.name}: ${paymentAmount}`);
    toast({ title: "Payment Recorded (Simulated)", description: `Payment of ${paymentAmount} for ${selectedStudentData.name} logged.` });
    // Placeholder: In future, refetch/update studentFeeList
    // setSelectedStudentId(null);
    // setPaymentAmount("");
  };

  const handleGenerateReceipt = (studentId: string) => {
    const student = studentFeeList.find(s => s._id.toString() === studentId);
    if (!student) return;
    // TODO: Implement client-side PDF generation or server-side receipt generation
    toast({ title: "Generate Receipt (Simulated)", description: `Generating PDF receipt for ${student.name}.` });
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading fee management data...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in as a school administrator to manage fees.</p>
          <Button onClick={() => window.location.href = '/'} className="mt-4">Go to Login</Button>
        </CardContent>
      </Card>
    );
  }

   if (!schoolDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-destructive"/> Configuration Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">School details could not be loaded. Fee management requires school fee structures to be configured.</p>
          <p className="mt-2 text-sm text-muted-foreground">Please ensure the school profile is correctly set up by a Super Admin.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center"><DollarSign className="mr-2 h-6 w-6" /> Fee Management</CardTitle>
          <CardDescription>Manage student fees for {schoolDetails?.schoolName || "your school"}, record payments, and generate receipts.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="student-select">Select Student</Label>
              <Select 
                onValueChange={setSelectedStudentId} 
                value={selectedStudentId || ""}
                disabled={students.length === 0}
              >
                <SelectTrigger id="student-select">
                  <SelectValue placeholder={students.length > 0 ? "Select a student" : "No students available"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student._id.toString()} value={student._id.toString()}>
                      {student.name} ({student.classId || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStudentData && (
              <>
                <p className="text-sm">Class: {selectedStudentData.className || 'N/A'}</p>
                <p className="text-sm">Total Fee: ${selectedStudentData.totalFee.toLocaleString()}</p>
                <p className="text-sm">Amount Paid (Simulated): ${selectedStudentData.paidAmount.toLocaleString()}</p>
                <p className="text-sm font-semibold">Amount Due (Simulated): ${selectedStudentData.dueAmount.toLocaleString()}</p>
              </>
            )}
            <div>
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input 
                id="payment-amount" 
                type="number" 
                placeholder="Enter amount" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={!selectedStudentData}
              />
            </div>
            <Button onClick={handleRecordPayment} disabled={!selectedStudentData || !paymentAmount || +paymentAmount <= 0} className="w-full">
              Record Payment (Simulated)
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Student Fee Records</CardTitle>
            <CardDescription>Overview of total fees per student based on their class.</CardDescription>
            {/* TODO: Add Search/Filter for student list */}
            {/* <div className="flex items-center gap-2 pt-2">
                <Input placeholder="Search students..." className="max-w-sm"/>
                <Button variant="outline" size="icon"><Search className="h-4 w-4"/></Button>
                <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
            </div> */}
          </CardHeader>
          <CardContent>
            {studentFeeList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid (Simulated)</TableHead>
                    <TableHead>Due (Simulated)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentFeeList.map((student) => (
                    <TableRow key={student._id.toString()}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.className || 'N/A'}</TableCell>
                      <TableCell>${student.totalFee.toLocaleString()}</TableCell>
                      <TableCell>${student.paidAmount.toLocaleString()}</TableCell>
                      <TableCell className={student.dueAmount > 0 ? "text-destructive font-semibold" : "text-green-600"}>
                        ${student.dueAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleGenerateReceipt(student._id.toString())}>
                          <Printer className="mr-2 h-4 w-4" /> Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {students.length === 0 ? "No students found for this school." : "Fee details being processed or no students with fee configurations."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    