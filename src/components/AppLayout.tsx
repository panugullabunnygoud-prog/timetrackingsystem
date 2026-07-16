import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  Clock,
  Home,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  admin?: boolean;
}

const employeeNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/tracker", label: "Time Tracker", icon: Clock },
  { to: "/history", label: "Attendance", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/leave", label: "Leave", icon: Calendar },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Overview", icon: Shield, admin: true },
  { to: "/admin/employees", label: "Employees", icon: Users, admin: true },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardList, admin: true },
  { to: "/admin/leave", label: "Leave Requests", icon: Calendar, admin: true },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, admin: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = user?.role === "Admin" ? [...employeeNav, ...adminNav] : employeeNav;

  const handleLogout = () => {
    logout();
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 -ml-2">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
            AT
          </div>
          Attendly
        </div>
        <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar text-sidebar-foreground transform transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b px-5">
            <div className="flex items-center gap-2 font-semibold">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
                AT
              </div>
              <span>Attendly</span>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden p-2 -mr-2" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="p-3 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace
              </div>
              <div className="space-y-1">
                {items
                  .filter((i) => !i.admin)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      item={item}
                      active={pathname === item.to}
                      onClick={() => setOpen(false)}
                    />
                  ))}
              </div>
            </div>

            {user?.role === "Admin" && (
              <div>
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </div>
                <div className="space-y-1">
                  {items
                    .filter((i) => i.admin)
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        item={item}
                        active={
                          item.to === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.to)
                        }
                        onClick={() => setOpen(false)}
                      />
                    ))}
                </div>
              </div>
            )}

            <div className="pt-4 mt-4 border-t space-y-1">
              <div className="px-3 py-2 rounded-lg bg-sidebar-accent">
                <div className="text-sm font-medium truncate">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-primary">
                  {user?.role}
                </div>
              </div>
              <button
                onClick={toggle}
                className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </nav>
        </aside>

        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden
          />
        )}

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
