import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Users, Settings, BarChart3 } from "lucide-react";

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Super Admin Dashboard</CardTitle>
          <CardDescription>Oversee and manage the entire CampusFlow platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Welcome, Super Administrator. From here you can manage schools, system settings, and view platform analytics.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <School className="h-10 w-10 text-primary mb-2" />
            <CardTitle>School Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Create new schools, manage existing ones, and configure school-specific settings.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/super-admin/schools">Manage Schools</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Users className="h-10 w-10 text-primary mb-2" />
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Manage administrator accounts for each school.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/super-admin/users">Manage Admins</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Settings className="h-10 w-10 text-primary mb-2" />
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Configure global platform settings and parameters.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/super-admin/settings">Platform Settings</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>View overall platform usage statistics and reports.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/super-admin/analytics">View Analytics</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
