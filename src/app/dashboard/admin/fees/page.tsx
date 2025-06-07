"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Printer, Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockStudents = [
  { id: "S001", name: "Alice Smith", class: "Grade 10A", totalFee: 5000, paid: 3000, due: 2000 },
  { id: "S002", name: "Bob Johnson", class: "Grade 9B", totalFee: 4500, paid: 4500, due: 0 },
  { id: "S003", name: "Charlie Brown", class: "Grade 11C", totalFee: 5500, paid: 2000, due: 3500 },
];

const mockFeeTypes = [
  { id: "tuition", name: "Tuition Fee", amount: 3000 },
  { id: "bus", name: "Bus Fee", amount: 500 },
  { id: "canteen", name: "Canteen Fee", amount: 300 },
];

export default function FeeManagementPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const { toast } = useToast();

  const selectedStudent = mockStudents.find(s => s.id === selectedStudentId);

  useEffect(() => {
    if (selectedStudent) {
      // Auto-fill configured amount (e.g., outstanding due amount)
      setPaymentAmount(selectedStudent.due > 0 ? selectedStudent.due : "");
    } else {
      setPaymentAmount("");
    }
  }, [selectedStudentId]);

  const handleRecordPayment = () => {
    if (!selectedStudent || !paymentAmount || +paymentAmount <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a student and enter a valid payment amount." });
      return;
    }
    // TODO: Implement actual payment recording logic
    console.log(`Recording payment for ${selectedStudent.name}: ${paymentAmount}`);
    toast({ title: "Payment Recorded", description: `Payment of ${paymentAmount} for ${selectedStudent.name} recorded.` });
    // Reset form, update student list (mock)
    setSelectedStudentId(null);
    setPaymentAmount("");
  };

  const handleGenerateReceipt = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (!student) return;
    // TODO: Implement client-side PDF generation
    toast({ title: "Generate Receipt", description: `Generating PDF receipt for ${student.name}. (Feature placeholder)` });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center"><DollarSign className="mr-2 h-6 w-6" /> Fee Management</CardTitle>
          <CardDescription>Manage student fees, record payments, and generate receipts.</CardDescription>
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
              <Select onValueChange={setSelectedStudentId} value={selectedStudentId || ""}>
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {mockStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name} ({student.class})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStudent && (
              <>
                <p className="text-sm">Total Fee: ${selectedStudent.totalFee}</p>
                <p className="text-sm">Amount Paid: ${selectedStudent.paid}</p>
                <p className="text-sm font-semibold">Amount Due: ${selectedStudent.due}</p>
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
                disabled={!selectedStudent}
              />
            </div>
             {/* Placeholder for fee type selection if needed */}
            {/* <div>
              <Label htmlFor="fee-type-select">Fee Type</Label>
              <Select>
                <SelectTrigger id="fee-type-select"><SelectValue placeholder="Select fee type" /></SelectTrigger>
                <SelectContent>
                  {mockFeeTypes.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.name} (${ft.amount})</SelectItem>)}
                </SelectContent>
              </Select>
            </div> */}
            <Button onClick={handleRecordPayment} disabled={!selectedStudent || !paymentAmount || +paymentAmount <= 0} className="w-full">
              Record Payment
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Student Fee Records</CardTitle>
            <div className="flex items-center gap-2 pt-2">
                <Input placeholder="Search students..." className="max-w-sm"/>
                <Button variant="outline" size="icon"><Search className="h-4 w-4"/></Button>
                <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Total Fee</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>${student.totalFee}</TableCell>
                    <TableCell>${student.paid}</TableCell>
                    <TableCell className={student.due > 0 ? "text-destructive font-semibold" : "text-green-600"}>
                      ${student.due}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleGenerateReceipt(student.id)}>
                        <Printer className="mr-2 h-4 w-4" /> Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {mockStudents.length === 0 && <p className="text-center text-muted-foreground py-4">No student fee records found.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
