import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  computeMs,
  getAttendance,
  getEmployees,
  logAudit,
  saveAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/db";
import { fmtDate, fmtDuration, fmtHours, fmtTime } from "@/lib/format";
import { exportXLSX } from "@/lib/export";

export const Route = createFileRoute("/_app/admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Admin" }] }),
  component: AdminAttendance,
});

function AdminAttendance() {
  const { user } = useAuth();
  const [empId, setEmpId] = useState("all");
  const [dept, setDept] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [, setTick] = useState(0);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const employees = getEmployees();
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();

  const rows = useMemo(() => {
    let list = getAttendance().slice().sort((a, b) => b.date.localeCompare(a.date));
    if (empId !== "all") list = list.filter((r) => r.employeeId === empId);
    if (dept !== "all")
      list = list.filter((r) => empMap.get(r.employeeId)?.department === dept);
    if (from) list = list.filter((r) => r.date >= from);
    if (to) list = list.filter((r) => r.date <= to);
    return list.slice(0, 500);
  }, [empId, dept, from, to, empMap]);

  const doExport = () => {
    exportXLSX(
      `attendance-admin.xlsx`,
      rows.map((r) => {
        const { workMs, breakMs } = computeMs(r);
        const e = empMap.get(r.employeeId);
        return {
          Date: r.date,
          "Employee ID": r.employeeId,
          Name: e?.name ?? "—",
          Department: e?.department ?? "—",
          "Check In": r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "—",
          "Check Out": r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "—",
          "Break": fmtDuration(breakMs),
          "Total Hours": fmtHours(workMs),
          Status: r.status,
        };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Attendance"
        subtitle="Filter, review, and correct attendance records"
        actions={
          <Button variant="outline" onClick={doExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.filter((e) => e.role === "Employee").map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const { workMs, breakMs } = computeMs(r);
                const e = empMap.get(r.employeeId);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.date)}</TableCell>
                    <TableCell className="font-medium">{e?.name ?? r.employeeId}</TableCell>
                    <TableCell className="text-muted-foreground">{e?.department ?? "—"}</TableCell>
                    <TableCell>{fmtTime(r.checkIn)}</TableCell>
                    <TableCell>{fmtTime(r.checkOut)}</TableCell>
                    <TableCell className="tabular-nums">{fmtDuration(breakMs)}</TableCell>
                    <TableCell className="tabular-nums font-semibold">{fmtHours(workMs)}h</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          r.status === "Present"
                            ? "bg-success text-success-foreground"
                            : r.status === "Late"
                              ? "bg-warning text-warning-foreground"
                              : r.status === "Absent"
                                ? "bg-destructive text-destructive-foreground"
                                : ""
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setEditing({ ...r })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No matching records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EditAttendanceDialog
        rec={editing}
        onClose={() => setEditing(null)}
        onSave={(r) => {
          saveAttendance(r);
          logAudit(user?.id ?? "", "EDIT_ATTENDANCE", `${r.employeeId} ${r.date}`);
          toast.success("Attendance updated");
          setEditing(null);
        }}
      />
    </div>
  );
}

function EditAttendanceDialog({
  rec,
  onClose,
  onSave,
}: {
  rec: AttendanceRecord | null;
  onClose: () => void;
  onSave: (r: AttendanceRecord) => void;
}) {
  const [draft, setDraft] = useState<AttendanceRecord | null>(rec);
  useEffect(() => setDraft(rec), [rec]);

  const asTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const setTime = (dateStr: string, hhmm: string) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit attendance {draft && `— ${draft.date}`}</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Check In</Label>
              <Input
                type="time"
                value={asTime(draft.checkIn)}
                onChange={(e) =>
                  setDraft({ ...draft, checkIn: setTime(draft.date, e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Check Out</Label>
              <Input
                type="time"
                value={asTime(draft.checkOut)}
                onChange={(e) =>
                  setDraft({ ...draft, checkOut: setTime(draft.date, e.target.value) })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as AttendanceStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Present", "Late", "Absent", "On Leave"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Note (optional)</Label>
              <Input
                value={draft.note ?? ""}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="Reason for correction"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => draft && onSave(draft)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
