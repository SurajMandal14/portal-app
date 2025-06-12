
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Receipt, Info, Loader2, ListChecks } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getFeePaymentsByStudent } from "@/app/actions/fees";
import { getSchoolById } from "@/app/actions/schools";
import type { FeePayment } from "@/types/fees";
import type { School, TermFee } from "@/types/school"; // Import TermFee
import type { AuthUser } from "@/types/attendance"; 

interface FeeSummary {
  totalFee: number; // Represents annual tuition fee
  totalPaid: number;
  totalDue: number;
  percentagePaid: number;
}

export default function StudentFeesPage() {
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId && parsedUser.classId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a student with class assignment to view fees." });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        setAuthUser(null);
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const calculateAnnualTuitionFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig || !schoolConfig.tuitionFees) return 0;
    const classFeeConfig = schoolConfig.tuitionFees.find(cf => cf.className === className);
    if (!classFeeConfig || !classFeeConfig.terms) return 0;
    return classFeeConfig.terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);

  const fetchData = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId || !authUser.classId) {
      setIsLoading(false);
      if (authUser && !authUser.classId) {
         toast({ variant: "warning", title: "Information Missing", description: "Your class assignment is not set. Cannot calculate fees."});
      }
      return;
    }

    setIsLoading(true);
    try {
      const [paymentsResult, schoolResult] = await Promise.all([
        getFeePaymentsByStudent(authUser._id.toString(), authUser.schoolId.toString()),
        getSchoolById(authUser.schoolId.toString())
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "School Info Error", description: schoolResult.message || "Could not load school details." });
        setSchoolDetails(null);
      }

      if (paymentsResult.success && paymentsResult.payments) {
        setFeePayments(paymentsResult.payments);
      } else {
        toast({ variant: "warning", title: "Payment History", description: paymentsResult.message || "Could not load your payment history or none found." });
        setFeePayments([]);
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred fetching your fee data." });
      setFeePayments([]);
      setSchoolDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?._id && authUser?.schoolId && authUser?.classId) {
      fetchData();
    } else {
      setIsLoading(false); 
    }
  }, [authUser, fetchData]);

  useEffect(() => {
    if (schoolDetails && authUser?.classId) {
      const totalAnnualTuitionFee = calculateAnnualTuitionFee(authUser.classId as string, schoolDetails);
      const totalPaid = feePayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
      const totalDue = totalAnnualTuitionFee - totalPaid;
      const percentagePaid = totalAnnualTuitionFee > 0 ? Math.round((totalPaid / totalAnnualTuitionFee) * 100) : 0;
      setFeeSummary({ totalFee: totalAnnualTuitionFee, totalPaid, totalDue, percentagePaid });
    } else {
      setFeeSummary(null);
    }
  }, [schoolDetails, feePayments, authUser, calculateAnnualTuitionFee]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
          <p>Please log in as a student to view your fee details.</p>
        </CardContent>
      </Card>
    );
  }

  if (!authUser.classId || !schoolDetails) {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-yellow-500"/> Fee Information Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
            <p>Your fee details cannot be displayed currently.</p>
            {!authUser.classId && <p className="text-muted-foreground">Reason: You are not assigned to a class. Please contact administration.</p>}
            {!schoolDetails && authUser.classId && <p className="text-muted-foreground">Reason: School fee configuration could not be loaded. Please try again later or contact administration.</p>}
        </CardContent>
      </Card>
    )
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <DollarSign className="mr-2 h-6 w-6" /> My Fee Status
          </CardTitle>
          <CardDescription>Overview of your fee payments and dues for {authUser.classId}.</CardDescription>
        </CardHeader>
      </Card>

      {feeSummary ? (
        <Card>
          <CardHeader>
            <CardTitle>Fee Summary (Annual Tuition)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col space-y-1 rounded-lg border p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Total Applicable Fee</p>
              <p className="text-2xl font-bold"><span className="font-sans">₹</span>{feeSummary.totalFee.toLocaleString()}</p>
            </div>
            <div className="flex flex-col space-y-1 rounded-lg border p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600"><span className="font-sans">₹</span>{feeSummary.totalPaid.toLocaleString()}</p>
            </div>
            <div className="flex flex-col space-y-1 rounded-lg border p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Remaining Due</p>
              <p className={`text-2xl font-bold ${feeSummary.totalDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                <span className="font-sans">₹</span>{feeSummary.totalDue.toLocaleString()}
              </p>
            </div>
            <div className="md:col-span-3 flex flex-col space-y-1 rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Payment Progress</p>
                <ListChecks className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{feeSummary.percentagePaid}%</p>
              <Progress value={feeSummary.percentagePaid} className="h-3 mt-1" />
              <p className="text-xs text-muted-foreground"><span className="font-sans">₹</span>{feeSummary.totalPaid.toLocaleString()} / <span className="font-sans">₹</span>{feeSummary.totalFee.toLocaleString()} paid</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent className="py-6">
                <p className="text-center text-muted-foreground">Calculating fee summary...</p>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Detailed log of all payments made.</CardDescription>
        </CardHeader>
        <CardContent>
          {feePayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Amount Paid (<span className="font-sans">₹</span>)</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Recorded On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feePayments.map((payment) => (
                  <TableRow key={payment._id.toString()}>
                    <TableCell>{format(new Date(payment.paymentDate), "PPP")}</TableCell>
                    <TableCell><span className="font-sans">₹</span>{payment.amountPaid.toLocaleString()}</TableCell>
                    <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
                    <TableCell>{payment.notes || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(payment.createdAt), "Pp")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No payment records found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
