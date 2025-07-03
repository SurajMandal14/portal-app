
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Construction } from "lucide-react";

export default function MasterAdminPromoteStudentsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <GraduationCap className="mr-2 h-6 w-6" /> Student Promotion Module
          </CardTitle>
          <CardDescription>
            Promote students to the next class and manage academic year transitions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              Feature Coming Soon
            </h3>
            <p className="text-muted-foreground">
              The student promotion module will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
