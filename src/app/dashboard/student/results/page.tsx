
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Construction } from "lucide-react"; // Using Award icon for results

export default function StudentResultsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Award className="mr-2 h-6 w-6" /> Exam Results
          </CardTitle>
          <CardDescription>
            View your academic performance and exam results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              Results Feature Coming Soon
            </h3>
            <p className="text-muted-foreground">
              Your exam results and grades will be shown here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
