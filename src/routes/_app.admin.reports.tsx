import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  computeMs,
  getAttendance,
  getEmployees,
  STANDARD_DAY_MS,
} from "@/lib/db";
import { startOfMonth, startOfWeek, ymd } from "@/lib/format";
import { exportPDF, exportXLSX } from "@/lib/export";

export const Route = createFileRoute("/_app/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin" }] }),
  component: AdminReports,
});

type Range = "day" | "week" | "month";

function AdminReports() {
  const [range, setRange] = useState<Range>("week");
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => window.removeEventListener("ams:change", onChange);
  }, []);

  const data = useMemo(() => {
    const employees = getEmployees().filter((e) => e.role === "Employee");
    const empMap = new Map(employees.map((e) => [e.id, e]));
    const today = new Date();
    let start: Date;
    let days: Date[];
    if (range === "day") {
      start = today;
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
    const from = ymd(days[0]);
    const to = ymd(days[days.length - 1]);
    const attendance = getAttendance().filter((a) => a.date >= from && a.date <= to);

    const perEmployee = employees.map((e) => {
      const recs = attendance.filter((a) => a.employeeId === e.id);
      const totalMs = recs.reduce((s, r) => s + computeMs(r).workMs, 0);
      const overtimeMs = recs.reduce(
        (s, r) => s + Math.max(0, computeMs(r).workMs - STANDARD_DAY_MS),
        0,
      );
      return {
        id: e.id,
        name: e.name,
        department: e.department,
        hours: Number((totalMs / 3600000).toFixed(2)),
        overtime: Number((overtimeMs / 3600000).toFixed(2)),
        present: recs.filter((r) => r.status === "Present").length,
        late: recs.filter((r) => r.status === "Late").length,
        absent: recs.filter((r) => r.status === "Absent").length,
      };
    });

    const perDay = days.map((d) => {
      const key = ymd(d);
      const recs = attendance.filter((a) => a.date === key);
      return {
        label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        present: recs.filter((r) => r.status === "Present").length,
        late: recs.filter((r) => r.status === "Late").length,
        absent: recs.filter((r) => r.status === "Absent").length,
      };
    });

    const totals = perEmployee.reduce(
      (t, x) => ({
        hours: t.hours + x.hours,
        overtime: t.overtime + x.overtime,
        late: t.late + x.late,
        absent: t.absent + x.absent,
      }),
      { hours: 0, overtime: 0, late: 0, absent: 0 },
    );

    const byDept = Array.from(
      perEmployee.reduce((m, e) => {
        m.set(e.department, (m.get(e.department) ?? 0) + e.hours);
        return m;
      }, new Map<string, number>()),
    ).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));

    void empMap;
    return { perEmployee, perDay, totals, byDept };
  }, [range]);

  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  const exportExcel = () => {
    exportXLSX(
      `team-report-${range}.xlsx`,
      data.perEmployee.map((r) => ({
        "Employee ID": r.id,
        Name: r.name,
        Department: r.department,
        "Hours Worked": r.hours,
        "Overtime Hours": r.overtime,
        Present: r.present,
        Late: r.late,
        Absent: r.absent,
      })),
    );
  };
  const exportPdf = () => {
    exportPDF(
      `team-report-${range}.pdf`,
      `Team Report — ${range[0].toUpperCase() + range.slice(1)}`,
      ["ID", "Name", "Department", "Hours", "Overtime", "Present", "Late", "Absent"],
      data.perEmployee.map((r) => [
        r.id,
        r.name,
        r.department,
        r.hours.toFixed(2),
        r.overtime.toFixed(2),
        r.present,
        r.late,
        r.absent,
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Reports"
        subtitle="Attendance, overtime, and absences across the company"
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
        <TabsContent value={range} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total hours" value={`${data.totals.hours.toFixed(1)}h`} />
            <Stat label="Overtime" value={`${data.totals.overtime.toFixed(1)}h`} tone="warning" />
            <Stat label="Late arrivals" value={String(data.totals.late)} tone="warning" />
            <Stat label="Absences" value={String(data.totals.absent)} tone="destructive" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-6">
              <h3 className="font-semibold">Attendance per day</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer>
                  <BarChart data={data.perDay}>
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
                    <Bar dataKey="present" stackId="a" fill="var(--success)" name="Present" />
                    <Bar dataKey="late" stackId="a" fill="var(--warning)" name="Late" />
                    <Bar dataKey="absent" stackId="a" fill="var(--destructive)" name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold">Hours by department</h3>
              <div className="mt-4 h-72">
                {data.byDept.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.byDept} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={4}>
                        {data.byDept.map((_, i) => (
                          <Cell key={i} fill={colors[i % colors.length]} />
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

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Per employee</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Department</th>
                    <th className="py-2 pr-4 text-right">Hours</th>
                    <th className="py-2 pr-4 text-right">Overtime</th>
                    <th className="py-2 pr-4 text-right">Present</th>
                    <th className="py-2 pr-4 text-right">Late</th>
                    <th className="py-2 text-right">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perEmployee.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.department}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.hours.toFixed(1)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-warning">{r.overtime.toFixed(1)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.present}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.late}</td>
                      <td className="py-2 text-right tabular-nums">{r.absent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
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
