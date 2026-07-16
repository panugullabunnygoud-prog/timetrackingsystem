import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { createLeave, deleteLeave, getLeaves, logAudit, type LeaveType } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/leave")({
  head: () => ({ meta: [{ title: "Leave — Attendly" }] }),
  component: LeavePage,
});

function LeavePage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("Annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const mine = useMemo(() => {
    if (!user) return [];
    return getLeaves()
      .filter((l) => l.employeeId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [user]);

  const balance = useMemo(() => {
    const approved = mine.filter((l) => l.status === "Approved");
    const days = approved.reduce((s, l) => {
      const a = new Date(l.startDate);
      const b = new Date(l.endDate);
      return s + Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
    }, 0);
    return { used: days, remaining: Math.max(0, 20 - days) };
  }, [mine]);

  const submit = () => {
    if (!user) return;
    if (!start || !end) return toast.error("Pick start and end dates");
    if (start > end) return toast.error("End date must be after start");
    createLeave({ employeeId: user.id, type, startDate: start, endDate: end, reason });
    logAudit(user.id, "LEAVE_REQUEST", `${type} ${start}→${end}`);
    toast.success("Leave request submitted");
    setOpen(false);
    setStart("");
    setEnd("");
    setReason("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        subtitle="Request time off and track approvals."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual">Annual</SelectItem>
                      <SelectItem value="Sick">Sick</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Annual allowance</div>
          <div className="mt-2 text-3xl font-bold">20 days</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Used</div>
          <div className="mt-2 text-3xl font-bold text-primary">{balance.used}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Remaining</div>
          <div className="mt-2 text-3xl font-bold text-success">{balance.remaining}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No leave requests yet
                  </TableCell>
                </TableRow>
              )}
              {mine.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.type}</TableCell>
                  <TableCell>{fmtDate(l.startDate)}</TableCell>
                  <TableCell>{fmtDate(l.endDate)}</TableCell>
                  <TableCell className="max-w-xs truncate">{l.reason || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        l.status === "Approved"
                          ? "bg-success text-success-foreground"
                          : l.status === "Rejected"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning text-warning-foreground"
                      }
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.status === "Pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          deleteLeave(l.id);
                          toast.success("Request withdrawn");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
