
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Construction, CheckSquare, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function MasterAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Settings className="mr-2 h-6 w-6" /> Operational Settings
          </CardTitle>
          <CardDescription>
            Manage attendance types, academic years, and marks entry permissions for schools.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Attendance Settings</CardTitle>
            <CardDescription>Control how attendance is marked across schools.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="attendance-type" className="text-base">Attendance Type</Label>
                    <p className="text-sm text-muted-foreground">
                        Current: <span className="font-semibold">Monthly View</span>. (Other options coming soon)
                    </p>
                </div>
                <Button variant="outline" disabled>Change Type</Button>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Marks Entry Lock</CardTitle>
            <CardDescription>Enable or disable marks entry for specific assessments for all schools.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'].map(assessment => (
                <div key={assessment} className="flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor={`lock-${assessment}`} className="text-base">{assessment} Entry</Label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600">Unlocked</span>
                        <Switch id={`lock-${assessment}`} disabled />
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
      
    </div>
  );
}
