
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search } from "lucide-react";

// Mock data
const mockUsers = [
  { id: "T001", name: "Mrs. Davis", role: "Teacher", email: "davis@example.com", classAssigned: "Grade 10A" },
  { id: "S001", name: "Alice Smith", role: "Student", email: "alice@example.com", classAssigned: "Grade 10A" },
  { id: "S002", name: "Bob Johnson", role: "Student", email: "bob@example.com", classAssigned: "Grade 9B" },
  { id: "T002", name: "Mr. Wilson", role: "Teacher", email: "wilson@example.com", classAssigned: "Grade 9B" },
];

export default function AdminUserManagementPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> User Management
          </CardTitle>
          <CardDescription>Add, edit, and manage teacher and student accounts for your school.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>User List</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search users..." className="w-full sm:max-w-xs" />
              <Button variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Class/Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'Teacher' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.classAssigned}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {mockUsers.length === 0 && <p className="text-center text-muted-foreground py-4">No users found.</p>}
        </CardContent>
      </Card>
      
      {/* Placeholder for Add/Edit User Form Modal/Dialog */}
      {/* <Dialog>
        <DialogTrigger asChild><Button>Add New User</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <p>User creation form will be here.</p>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}
