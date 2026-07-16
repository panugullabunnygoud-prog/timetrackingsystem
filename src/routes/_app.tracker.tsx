import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coffee, LogIn, LogOut, Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  clockIn,
  clockOut,
  computeMs,
  endBreak,
  getTodayRecord,
  logAudit,
  startBreak,
  STANDARD_DAY_MS,
} from "@/lib/db";
import { fmtDuration, fmtTime } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/tracker")({
  head: () => ({ meta: [{ title: "Time Tracker — Attendly" }] }),
  component: Tracker,
});

function Tracker() {
  const { user } = useAuth();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("ams:change", onChange);
    return () => {
      clearInterval(t);
      window.removeEventListener("ams:change", onChange);
    };
  }, []);

  if (!user) return null;
  const rec = getTodayRecord(user.id);
  const { workMs, breakMs } = rec ? computeMs(rec) : { workMs: 0, breakMs: 0 };
  const onBreak = rec?.breaks.some((b) => !b.end) ?? false;
  const clockedIn = !!rec?.checkIn && !rec?.checkOut;
  const clockedOut = !!rec?.checkOut;
  const currentBreak = rec?.breaks.find((b) => !b.end);
  const currentBreakMs = currentBreak ? Date.now() - new Date(currentBreak.start).getTime() : 0;

  const doAction = (fn: () => void, msg: string, action: string) => {
    try {
      fn();
      toast.success(msg);
      logAudit(user.id, action);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const progress = Math.min(100, (workMs / STANDARD_DAY_MS) * 100);

  const status = clockedOut
    ? { label: "Clocked out", cls: "bg-muted text-foreground" }
    : onBreak
      ? { label: "On break", cls: "bg-warning text-warning-foreground" }
      : clockedIn
        ? { label: "Working", cls: "bg-success text-success-foreground" }
        : { label: "Not started", cls: "" };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Tracker"
        subtitle="Clock in when you start, take breaks, and clock out when you finish."
        actions={<Badge className={status.cls}>{status.label}</Badge>}
      />

      <Card className="p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative text-center">
          <div className="text-sm uppercase tracking-widest text-muted-foreground">
            Working time
          </div>
          <div className="mt-2 text-6xl sm:text-7xl font-bold tabular-nums tracking-tight">
            {fmtDuration(workMs)}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {clockedIn
              ? `Started at ${fmtTime(rec?.checkIn ?? null)}`
              : clockedOut
                ? `Session ended at ${fmtTime(rec?.checkOut ?? null)}`
                : "Ready when you are"}
          </div>
          <div className="mt-6 max-w-md mx-auto">
            <Progress value={progress} />
            <div className="mt-1 text-xs text-muted-foreground">
              {progress.toFixed(0)}% of an 8-hour day
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!clockedIn && !clockedOut && (
              <Button
                size="lg"
                className="h-14 px-8 text-base"
                onClick={() => doAction(() => clockIn(user.id), "Clocked in", "CLOCK_IN")}
              >
                <LogIn className="mr-2 h-5 w-5" /> Clock In
              </Button>
            )}
            {clockedIn && !onBreak && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-6"
                  onClick={() =>
                    doAction(() => startBreak(user.id), "Break started", "BREAK_START")
                  }
                >
                  <Pause className="mr-2 h-5 w-5" /> Start Break
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-14 px-6"
                  onClick={() =>
                    doAction(() => clockOut(user.id), "Clocked out", "CLOCK_OUT")
                  }
                >
                  <LogOut className="mr-2 h-5 w-5" /> Clock Out
                </Button>
              </>
            )}
            {onBreak && (
              <Button
                size="lg"
                className="h-14 px-8 bg-warning text-warning-foreground hover:bg-warning/90"
                onClick={() => doAction(() => endBreak(user.id), "Break ended", "BREAK_END")}
              >
                <Play className="mr-2 h-5 w-5" /> End Break
              </Button>
            )}
            {clockedOut && (
              <div className="text-sm text-muted-foreground">
                All done for today. See you tomorrow!
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Clock In" value={fmtTime(rec?.checkIn ?? null)} icon={<LogIn className="h-4 w-4" />} />
        <MiniStat label="Clock Out" value={fmtTime(rec?.checkOut ?? null)} icon={<LogOut className="h-4 w-4" />} />
        <MiniStat
          label="Break Total"
          value={fmtDuration(breakMs)}
          icon={<Coffee className="h-4 w-4" />}
          hint={onBreak ? `Current: ${fmtDuration(currentBreakMs)}` : `${rec?.breaks.length ?? 0} breaks`}
        />
      </div>

      {rec && rec.breaks.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold">Breaks today</h3>
          <div className="mt-3 divide-y">
            {rec.breaks.map((b, i) => {
              const end = b.end ? new Date(b.end).getTime() : Date.now();
              const dur = end - new Date(b.start).getTime();
              return (
                <div key={i} className="py-2 flex items-center justify-between text-sm">
                  <div>Break #{i + 1}</div>
                  <div className="text-muted-foreground">
                    {fmtTime(b.start)} → {b.end ? fmtTime(b.end) : "active"}
                  </div>
                  <div className="tabular-nums font-medium">{fmtDuration(dur)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="h-7 w-7 rounded-md bg-accent grid place-items-center">{icon}</span>
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
