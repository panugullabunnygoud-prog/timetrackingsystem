import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { computeMs, getAttendanceFor, STANDARD_DAY_MS } from "@/lib/db";
import { fmtHours, startOfMonth, startOfWeek, ymd } from "@/lib/format";
import { exportPDF, exportXLSX } from "@/lib/export";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "My Reports — Attendly" }] }),
  component: ReportsPage,
});

type Range = "day" | "week" | "month";

function ReportsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("week");

  const data = useMemo(() => {
    if (!user) return null;
    const all = getAttendanceFor(user.id);
    const today = new Date();
    let start: Date;
    let days: Date[];
    if (range === "day") {
      start = new Date(today);
      days = [today];
    } else if (range === "week") {
      start = startOfWeek(today);
      days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    } else {
      start = startOfMonth(today);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      days = Array.from({ length: end.getDate() }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const rows = days.map((d) => {
      const rec = all.find((r) => r.date === ymd(d));
      const ms = rec ? computeMs(rec).workMs : 0;
      const hours = Number((ms / 3600000).toFixed(2));
      const overtime = Math.max(0, ms - STANDARD_DAY_MS) / 3600000;
      return {
        date: ymd(d),
        label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        hours,
        overtime: Number(overtime.toFixed(2)),
        status: rec?.status ?? "Absent",
      };
    });
    const totals = {
      hours: rows.reduce((s, r) => s + r.hours, 0),
      overtime: rows.reduce((s, r) => s + r.overtime, 0),
      late: rows.filter((r) => r.status === "Late").length,
      absent: rows.filter((r) => r.status === "Absent").length,
      leave: rows.filter((r) => r.status === "On Leave").length,
    };
    const pie = [
      { name: "Present", value: rows.filter((r) => r.status === "Present").length, color: "var(--success)" },
      { name: "Late", value: totals.late, color: "var(--warning)" },
      { name: "Absent", value: totals.absent, color: "var(--destructive)" },
      { name: "On Leave", value: totals.leave, color: "var(--primary)" },
    ].filter((p) => p.value > 0);
    return { rows, totals, pie };
  }, [user, range]);

  if (!user || !data) return null;

  const exportExcel = () => {
    exportXLSX(
      `report-${range}-${user.id}.xlsx`,
      data.rows.map((r) => ({
        Date: r.date,
        "Hours Worked": r.hours,
        "Overtime Hours": r.overtime,
        Status: r.status,
      })),
    );
  };
  const exportPdf = () => {
    exportPDF(
      `report-${range}-${user.id}.pdf`,
      `${range[0].toUpperCase() + range.slice(1)} Report — ${user.name}`,
      ["Date", "Hours", "Overtime", "Status"],
      data.rows.map((r) => [r.date, r.hours.toFixed(2), r.overtime.toFixed(2), r.status]),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Reports"
        subtitle="Analyze your working hours, overtime, and attendance."
        actions={
          <>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={exportPdf}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
        <TabsList>
          <TabsTrigger value="day">Daily</TabsTrigger>
          <TabsTrigger value="week">Weekly</TabsTrigger>
          <TabsTrigger value="month">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value={range} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Total Hours" value={`${data.totals.hours.toFixed(1)}h`} />
            <StatBox label="Overtime" value={`${data.totals.overtime.toFixed(1)}h`} tone="warning" />
            <StatBox label="Late Arrivals" value={String(data.totals.late)} tone="warning" />
            <StatBox label="Absences" value={String(data.totals.absent)} tone="destructive" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-6">
              <h3 className="font-semibold">Hours worked</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer>
                  <BarChart data={data.rows}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="overtime" name="Overtime" fill="var(--warning)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold">Status breakdown</h3>
              <div className="mt-4 h-72">
                {data.pie.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.pie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={4}>
                        {data.pie.map((p, i) => (
                          <Cell key={i} fill={p.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "destructive";
}) {
  const cls =
    tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <Card className="p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${cls}`}>{value}</div>
    </Card>
  );
}

export { fmtHours };
