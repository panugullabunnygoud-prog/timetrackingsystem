import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { computeMs, getAttendanceFor } from "@/lib/db";
import { fmtDate, fmtDuration, fmtHours, fmtTime } from "@/lib/format";
import { exportXLSX } from "@/lib/export";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "Attendance History — Attendly" }] }),
  component: History,
});

const PAGE_SIZE = 10;

function History() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const rows = useMemo(() => {
    if (!user) return [];
    let list = getAttendanceFor(user.id).slice().sort((a, b) => b.date.localeCompare(a.date));
    if (from) list = list.filter((r) => r.date >= from);
    if (to) list = list.filter((r) => r.date <= to);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (r) => r.date.includes(s) || r.status.toLowerCase().includes(s),
      );
    }
    return list;
  }, [user, q, from, to]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const doExport = () => {
    exportXLSX(
      `attendance-${user?.id}.xlsx`,
      rows.map((r) => {
        const { workMs, breakMs } = computeMs(r);
        return {
          Date: r.date,
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
        title="Attendance History"
        subtitle="Every day, searchable and filterable."
        actions={
          <Button variant="outline" onClick={doExport}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by date or status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
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
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((r) => {
                const { workMs, breakMs } = computeMs(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{fmtDate(r.date)}</TableCell>
                    <TableCell>{fmtTime(r.checkIn)}</TableCell>
                    <TableCell>{fmtTime(r.checkOut)}</TableCell>
                    <TableCell className="tabular-nums">{fmtDuration(breakMs)}</TableCell>
                    <TableCell className="tabular-nums font-semibold">
                      {fmtHours(workMs)}h
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between p-4 border-t text-sm">
          <div className="text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of{" "}
            {rows.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <div className="grid place-items-center px-3 text-sm">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present: "bg-success text-success-foreground",
    Late: "bg-warning text-warning-foreground",
    Absent: "bg-destructive text-destructive-foreground",
    "On Leave": "bg-accent text-accent-foreground",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}
