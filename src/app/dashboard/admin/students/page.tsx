
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookUser, Construction } from "lucide-react";

export default function AdminStudentsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookUser className="mr-2 h-6 w-6" /> Student Management
          </CardTitle>
          <CardDescription>
            Add, edit, and manage student accounts and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              Student Management Page - Coming Soon
            </h3>
            <p className="text-muted-foreground text-center">
              Functionality to manage students will be implemented here.
              For now, student and teacher management is combined on the old "Users" page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
