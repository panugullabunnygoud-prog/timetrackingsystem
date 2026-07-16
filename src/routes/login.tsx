import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock3, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Attendly" },
      { name: "description", content: "Sign in to Attendly to track attendance and manage leave." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: user.role === "Admin" ? "/admin" : "/dashboard", replace: true });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      nav({ to: u.role === "Admin" ? "/admin" : "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const quickFill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 p-12 text-primary-foreground">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
            <Clock3 className="h-5 w-5" />
          </div>
          Attendly
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Attendance, leave, and reports.<br />All in one calm workspace.
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Clock in, take breaks, request leave, and export polished reports — with a modern
            interface built for your entire team.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md pt-4">
            {[
              { k: "Live", v: "Time tracking" },
              { k: "Auto", v: "Overtime calc" },
              { k: "Export", v: "Excel & PDF" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl bg-white/10 backdrop-blur px-4 py-3">
                <div className="text-lg font-bold">{s.k}</div>
                <div className="text-xs text-primary-foreground/70">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Attendly
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 text-lg font-semibold">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Clock3 className="h-5 w-5" />
            </div>
            Attendly
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your work email and password to continue.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Contact your admin to reset your password. Demo: admin@company.com / admin123",
                    )
                  }
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <Card className="mt-8 p-4 bg-muted/40 border-dashed">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Demo accounts
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <button
                type="button"
                onClick={() => quickFill("admin@company.com", "admin123")}
                className="w-full flex justify-between items-center rounded-md px-3 py-2 hover:bg-background border"
              >
                <span>
                  <span className="font-medium">Admin</span>
                  <span className="text-muted-foreground ml-2">admin@company.com</span>
                </span>
                <span className="text-xs text-primary">Use →</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("alice@company.com", "password123")}
                className="w-full flex justify-between items-center rounded-md px-3 py-2 hover:bg-background border"
              >
                <span>
                  <span className="font-medium">Employee</span>
                  <span className="text-muted-foreground ml-2">alice@company.com</span>
                </span>
                <span className="text-xs text-primary">Use →</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
