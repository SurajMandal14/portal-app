
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookCopy, Construction } from "lucide-react";

export default function MasterAdminSubjectsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookCopy className="mr-2 h-6 w-6" /> Master Subjects List
          </CardTitle>
          <CardDescription>
            Manage the list of all subjects available across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              Feature Coming Soon
            </h3>
            <p className="text-muted-foreground">
              The master subject management tool will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
