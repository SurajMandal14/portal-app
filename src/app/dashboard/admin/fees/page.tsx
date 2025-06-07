
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign, Printer, Loader2, Info, CalendarDays, Edit, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/attendance";
import type { User as AppUser } from "@/types/user";
import type { School } from "@/types/school";
import type { FeePayment, FeePaymentPayload } from "@/types/fees";
import { getSchoolUsers } from "@/app/actions/schoolUsers";
import { getSchoolById } from "@/app/actions/schools";
import { recordFeePayment, getFeePaymentsBySchool } from "@/app/actions/fees";
import { format } from "date-fns";

interface StudentFeeDetailsProcessed extends AppUser {
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  className?: string; 
}

export default function FeeManagementPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [allSchoolPayments, setAllSchoolPayments] = useState<FeePayment[]>([]);
  
  const [studentFeeList, setStudentFeeList] = useState<StudentFeeDetailsProcessed[]>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId && parsedUser._id) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin with valid session data." });
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

  const processStudentFeeDetails = useCallback(() => {
    if (!schoolDetails || allStudents.length === 0) {
      setStudentFeeList([]);
      return;
    }

    const processedList = allStudents.map(student => {
      const totalFee = calculateTotalFee(student.classId as string, schoolDetails);
      const studentPayments = allSchoolPayments.filter(p => p.studentId.toString() === student._id.toString());
      const paidAmount = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
      const dueAmount = totalFee - paidAmount;

      return {
        ...student,
        className: student.classId as string,
        totalFee,
        paidAmount,
        dueAmount,
      };
    }) as StudentFeeDetailsProcessed[];
    setStudentFeeList(processedList);

  }, [allStudents, schoolDetails, allSchoolPayments, calculateTotalFee]);

  const fetchSchoolDataAndPayments = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [schoolResult, usersResult, paymentsResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()),
        getFeePaymentsBySchool(authUser.schoolId.toString())
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
      }

      if (usersResult.success && usersResult.users) {
        const studentUsers = usersResult.users.filter(u => u.role === 'student');
        setAllStudents(studentUsers);
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load students." });
        setAllStudents([]);
      }

      if (paymentsResult.success && paymentsResult.payments) {
        setAllSchoolPayments(paymentsResult.payments);
      } else {
        toast({ variant: "warning", title: "Payment Info", description: paymentsResult.message || "Could not load payment history or none found." });
        setAllSchoolPayments([]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred fetching school data." });
      setSchoolDetails(null);
      setAllStudents([]);
      setAllSchoolPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast]);
  
  useEffect(() => {
     processStudentFeeDetails();
  }, [allStudents, schoolDetails, allSchoolPayments, processStudentFeeDetails]);


  useEffect(() => {
    if (authUser && authUser.schoolId) {
      fetchSchoolDataAndPayments();
    } else {
      setIsLoading(false);
      setSchoolDetails(null);
      setAllStudents([]);
      setAllSchoolPayments([]);
    }
  }, [authUser, fetchSchoolDataAndPayments]);
  

  const selectedStudentFullData = selectedStudentId ? studentFeeList.find(s => s._id.toString() === selectedStudentId) : null;

  useEffect(() => {
    if (selectedStudentFullData) {
      setPaymentAmount(selectedStudentFullData.dueAmount > 0 ? selectedStudentFullData.dueAmount : "");
      setPaymentDate(new Date()); // Set on client after student is selected
      setPaymentMethod("");
      setPaymentNotes("");
    } else {
      setPaymentAmount("");
      setPaymentDate(undefined); // Clear date if no student
    }
  }, [selectedStudentId, selectedStudentFullData]); // Re-run when selected student changes


  const handleRecordPayment = async () => {
    if (!selectedStudentFullData || !paymentAmount || +paymentAmount <= 0 || !paymentDate || !authUser?._id || !authUser?.schoolId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a student, enter a valid payment amount, date, and ensure admin details are available." });
      return;
    }
    setIsSubmittingPayment(true);

    const payload: FeePaymentPayload = {
      studentId: selectedStudentFullData._id.toString(),
      studentName: selectedStudentFullData.name || 'N/A',
      schoolId: authUser.schoolId.toString(),
      classId: selectedStudentFullData.className || 'N/A',
      amountPaid: +paymentAmount,
      paymentDate: paymentDate,
      recordedByAdminId: authUser._id.toString(),
      paymentMethod: paymentMethod || undefined,
      notes: paymentNotes || undefined,
    };

    const result = await recordFeePayment(payload);
    setIsSubmittingPayment(false);

    if (result.success) {
      toast({ title: "Payment Recorded", description: result.message });
      if (authUser?.schoolId) {
        const paymentsResult = await getFeePaymentsBySchool(authUser.schoolId.toString());
        if (paymentsResult.success && paymentsResult.payments) {
          setAllSchoolPayments(paymentsResult.payments);
        }
      }
      setSelectedStudentId(null); 
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentNotes("");
      setPaymentDate(undefined); // Reset date field
    } else {
      toast({ variant: "destructive", title: "Payment Failed", description: result.error || result.message });
    }
  };

  const handleGenerateReceipt = (studentId: string) => {
    const student = studentFeeList.find(s => s._id.toString() === studentId);
    if (!student) return;
    toast({ title: "Generate Receipt (Simulated)", description: `Generating PDF receipt for ${student.name}. This feature is not yet implemented.` });
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
          <p className="mt-2 text-sm text-muted-foreground">Please ensure the school profile is correctly set up by a Super Admin, including class fee configurations.</p>
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
                disabled={allStudents.length === 0 || isSubmittingPayment}
              >
                <SelectTrigger id="student-select">
                  <SelectValue placeholder={allStudents.length > 0 ? "Select a student" : "No students available"} />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map(student => (
                    <SelectItem key={student._id.toString()} value={student._id.toString()}>
                      {student.name} ({student.classId || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStudentFullData && (
              <>
                <p className="text-sm">Class: {selectedStudentFullData.className || 'N/A'}</p>
                <p className="text-sm">Total Fee: ${selectedStudentFullData.totalFee.toLocaleString()}</p>
                <p className="text-sm">Amount Paid: ${selectedStudentFullData.paidAmount.toLocaleString()}</p>
                <p className="text-sm font-semibold">Amount Due: ${selectedStudentFullData.dueAmount.toLocaleString()}</p>
                
                <div className="pt-2 space-y-3">
                    <div>
                        <Label htmlFor="payment-amount">Payment Amount</Label>
                        <Input 
                            id="payment-amount" 
                            type="number" 
                            placeholder="Enter amount" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            disabled={!selectedStudentFullData || isSubmittingPayment || selectedStudentFullData.dueAmount <= 0}
                        />
                    </div>
                    <div>
                        <Label htmlFor="payment-date">Payment Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="payment-date"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                                disabled={!selectedStudentFullData || isSubmittingPayment || !paymentDate}
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={paymentDate}
                                onSelect={setPaymentDate}
                                initialFocus
                                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="payment-method">Payment Method (Optional)</Label>
                        <Input 
                            id="payment-method" 
                            type="text" 
                            placeholder="e.g., Cash, Card, Online" 
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={!selectedStudentFullData || isSubmittingPayment}
                        />
                    </div>
                    <div>
                        <Label htmlFor="payment-notes">Notes (Optional)</Label>
                        <Textarea
                            id="payment-notes"
                            placeholder="e.g., Part payment for Term 1"
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            disabled={!selectedStudentFullData || isSubmittingPayment}
                        />
                    </div>
                </div>

                <Button 
                  onClick={handleRecordPayment} 
                  disabled={!selectedStudentFullData || !paymentAmount || +paymentAmount <= 0 || isSubmittingPayment || selectedStudentFullData.dueAmount <= 0 || !paymentDate} 
                  className="w-full"
                >
                  {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmittingPayment ? "Recording..." : "Record Payment"}
                </Button>
                {selectedStudentFullData.dueAmount <= 0 && <p className="text-sm text-green-600 text-center">No amount due for this student.</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Student Fee Status</CardTitle>
            <CardDescription>Overview of student fees, payments, and dues.</CardDescription>
          </CardHeader>
          <CardContent>
            {studentFeeList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
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
                      <TableCell className="space-x-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedStudentId(student._id.toString())} title="Record Payment">
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleGenerateReceipt(student._id.toString())} title="Generate Receipt (Simulated)">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {allStudents.length === 0 ? "No students found for this school." : "No fee details to display. Ensure students are assigned to classes with fee configurations."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
