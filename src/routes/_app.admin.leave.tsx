import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { getEmployees, getLeaves, logAudit, saveLeave } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/leave")({
  head: () => ({ meta: [{ title: "Leave Requests — Admin" }] }),
  component: AdminLeave,
});

function AdminLeave() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("Pending");
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const empMap = new Map(getEmployees().map((e) => [e.id, e]));

  const rows = useMemo(() => {
    let list = getLeaves().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter !== "all") list = list.filter((l) => l.status === filter);
    return list;
  }, [filter]);

  const act = (id: string, status: "Approved" | "Rejected") => {
    const l = getLeaves().find((x) => x.id === id);
    if (!l) return;
    saveLeave({ ...l, status });
    logAudit(user?.id ?? "", `LEAVE_${status.toUpperCase()}`, id);
    toast.success(`Request ${status.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        subtitle="Approve or reject employee leave"
        actions={
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => {
                const e = empMap.get(l.employeeId);
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{e?.name ?? l.employeeId}</div>
                      <div className="text-xs text-muted-foreground">{e?.department}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                    <TableCell>{fmtDate(l.startDate)}</TableCell>
                    <TableCell>{fmtDate(l.endDate)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {l.reason || "—"}
                    </TableCell>
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
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => act(l.id, "Approved")}
                          >
                            <Check className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => act(l.id, "Rejected")}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
