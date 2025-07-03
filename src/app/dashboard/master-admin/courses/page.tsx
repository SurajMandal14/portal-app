
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Construction } from "lucide-react";

export default function MasterAdminCoursesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <School className="mr-2 h-6 w-6" /> Course Materials
          </CardTitle>
          <CardDescription>
            Upload and manage PDF links for class subjects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              Feature Coming Soon
            </h3>
            <p className="text-muted-foreground">
              The course material management tool will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
