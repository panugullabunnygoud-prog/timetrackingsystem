import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import {
  deleteEmployee,
  getEmployees,
  logAudit,
  nextEmployeeId,
  saveEmployee,
  type Employee,
} from "@/lib/db";

export const Route = createFileRoute("/_app/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — Admin" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [, setTick] = useState(0);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const employees = getEmployees();
  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (dept !== "all" && e.department !== dept) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        e.name.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        e.id.toLowerCase().includes(s)
      );
    });
  }, [employees, q, dept]);

  const openNew = () =>
    setEditing({
      id: nextEmployeeId(),
      name: "",
      email: "",
      password: "password123",
      department: "Engineering",
      role: "Employee",
      status: "Active",
      joinedAt: new Date().toISOString(),
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Manage everyone on the team"
        actions={
          <Button onClick={openNew}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, or ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="min-w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.id}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.email}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>
                    <Badge variant={e.role === "Admin" ? "default" : "outline"}>{e.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        e.status === "Active"
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-foreground"
                      }
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={e.id === user?.id}
                        onClick={() => setDeleteId(e.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No employees match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EmployeeDialog
        emp={editing}
        onClose={() => setEditing(null)}
        onSave={(e) => {
          saveEmployee(e);
          logAudit(user?.id ?? "", "SAVE_EMPLOYEE", e.id);
          toast.success("Employee saved");
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the employee record. Attendance history will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteEmployee(deleteId);
                  logAudit(user?.id ?? "", "DELETE_EMPLOYEE", deleteId);
                  toast.success("Employee deleted");
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmployeeDialog({
  emp,
  onClose,
  onSave,
}: {
  emp: Employee | null;
  onClose: () => void;
  onSave: (e: Employee) => void;
}) {
  const [draft, setDraft] = useState<Employee | null>(emp);
  useEffect(() => setDraft(emp), [emp]);

  const isNew = emp && !getEmployees().some((e) => e.id === emp.id);

  const submit = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) {
      toast.error("Enter a valid email");
      return;
    }
    onSave(draft);
  };

  return (
    <Dialog open={!!emp} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add employee" : "Edit employee"}</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={draft.id} disabled />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as Employee["status"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={draft.department}
                onChange={(e) => setDraft({ ...draft, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={draft.role}
                onValueChange={(v) => setDraft({ ...draft, role: v as Employee["role"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Password</Label>
              <Input
                type="text"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>
            <Plus className="mr-2 h-4 w-4 -ml-1" />
            {isNew ? "Create" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
