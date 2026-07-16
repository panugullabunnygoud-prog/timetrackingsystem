import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Calendar, CheckCircle2, Clock, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  computeMs,
  getAttendance,
  getAudit,
  getEmployees,
  getLeaves,
} from "@/lib/db";
import { fmtDate, ymd } from "@/lib/format";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — Attendly" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const employees = getEmployees().filter((e) => e.role === "Employee");
  const active = employees.filter((e) => e.status === "Active");
  const today = ymd(new Date());
  const attendance = getAttendance();
  const todayRecs = attendance.filter((a) => a.date === today);
  const present = todayRecs.filter((a) => a.status === "Present").length;
  const late = todayRecs.filter((a) => a.status === "Late").length;
  const absent = active.length - todayRecs.filter((a) => a.checkIn).length;
  const leaves = getLeaves();
  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  const last7 = useMemo(() => {
    const days: { label: string; hours: number; present: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymd(d);
      const recs = attendance.filter((a) => a.date === key);
      const hours = recs.reduce((s, r) => s + computeMs(r).workMs, 0) / 3600000;
      days.push({
        label: d.toLocaleDateString([], { weekday: "short" }),
        hours: Number(hours.toFixed(1)),
        present: recs.filter((r) => r.checkIn).length,
      });
    }
    return days;
  }, [attendance]);

  const audit = getAudit().slice(0, 8);
  const empMap = new Map(getEmployees().map((e) => [e.id, e.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        subtitle="Company-wide attendance at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active employees" value={active.length} icon={<Users className="h-4 w-4" />} tone="primary" />
        <Stat label="Present today" value={present} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <Stat label="Late today" value={late} icon={<Clock className="h-4 w-4" />} tone="warning" />
        <Stat label="Absent today" value={Math.max(0, absent)} icon={<AlertCircle className="h-4 w-4" />} tone="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Team hours — last 7 days</h3>
              <p className="text-sm text-muted-foreground">Total working hours per day</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="hours" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Pending leave</h3>
            <Link to="/admin/leave" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {pendingLeaves.slice(0, 5).map((l) => (
              <div key={l.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm truncate">{empMap.get(l.employeeId) ?? "—"}</div>
                  <Badge variant="outline" className="text-[10px]">
                    <Calendar className="h-3 w-3 mr-1" />
                    {l.type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                </div>
              </div>
            ))}
            {pendingLeaves.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No pending requests</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold">Recent activity</h3>
        <div className="mt-3 divide-y">
          {audit.length === 0 && (
            <div className="text-sm text-muted-foreground py-3">No activity yet</div>
          )}
          {audit.map((a) => (
            <div key={a.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{empMap.get(a.actorId) ?? a.actorId}</span>
                <span className="text-muted-foreground"> — {a.action}</span>
                {a.target && <span className="text-muted-foreground"> · {a.target}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(a.ts).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const bg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${bg}`}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
