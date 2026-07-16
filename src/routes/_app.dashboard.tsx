import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Coffee, LogIn, LogOut, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  computeMs,
  getAttendanceFor,
  getTodayRecord,
  STANDARD_DAY_MS,
} from "@/lib/db";
import { fmtDuration, fmtHours, fmtTime, startOfWeek, ymd } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Attendly" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => {
      clearInterval(t);
      window.removeEventListener("ams:change", onChange);
    };
  }, []);
  void tick;

  if (!user) return null;
  const today = getTodayRecord(user.id);
  const { workMs, breakMs } = today ? computeMs(today) : { workMs: 0, breakMs: 0 };

  const weekStart = startOfWeek();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const records = getAttendanceFor(user.id);
  const weekData = weekDays.map((d) => {
    const rec = records.find((r) => r.date === ymd(d));
    const ms = rec ? computeMs(rec).workMs : 0;
    return {
      day: d.toLocaleDateString([], { weekday: "short" }),
      hours: Number((ms / 3600000).toFixed(2)),
    };
  });
  const weekTotal = weekData.reduce((s, x) => s + x.hours, 0);

  const statusBadge = () => {
    if (!today || !today.checkIn)
      return <Badge variant="outline">Not clocked in</Badge>;
    if (today.checkOut) return <Badge className="bg-muted text-foreground">Clocked out</Badge>;
    const onBreak = today.breaks.some((b) => !b.end);
    if (onBreak)
      return (
        <Badge className="bg-warning text-warning-foreground">On break</Badge>
      );
    return <Badge className="bg-success text-success-foreground">Working</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle={new Date().toLocaleDateString([], {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        actions={
          <>
            {statusBadge()}
            <Link to="/tracker">
              <Button>Open Time Tracker</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's hours"
          value={fmtDuration(workMs)}
          hint={`Target ${fmtHours(STANDARD_DAY_MS)}h`}
          icon={<Clock className="h-4 w-4" />}
          accent="primary"
        />
        <StatCard
          label="Clock in"
          value={fmtTime(today?.checkIn ?? null)}
          hint={today?.status ?? "—"}
          icon={<LogIn className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Clock out"
          value={fmtTime(today?.checkOut ?? null)}
          hint={today?.checkOut ? "Completed" : "In progress"}
          icon={<LogOut className="h-4 w-4" />}
          accent="destructive"
        />
        <StatCard
          label="Break time"
          value={fmtDuration(breakMs)}
          hint={`${today?.breaks.length ?? 0} breaks`}
          icon={<Coffee className="h-4 w-4" />}
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">This week</h3>
              <p className="text-sm text-muted-foreground">Daily working hours</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{weekTotal.toFixed(1)}h</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <TrendingUp className="h-3 w-3" /> weekly total
              </div>
            </div>
          </div>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
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
          <h3 className="font-semibold">Quick actions</h3>
          <p className="text-sm text-muted-foreground">Jump into common tasks</p>
          <div className="mt-4 space-y-2">
            <QuickAction to="/tracker" label="Time Tracker" desc="Clock in/out & breaks" />
            <QuickAction to="/history" label="Attendance History" desc="Search past records" />
            <QuickAction to="/reports" label="My Reports" desc="Daily / weekly / monthly" />
            <QuickAction to="/leave" label="Request Leave" desc="Submit a new request" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent: "primary" | "success" | "warning" | "destructive";
}) {
  const bg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[accent];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${bg}`}>{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}

function QuickAction({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
    >
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <span className="text-primary">→</span>
    </Link>
  );
}
