import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type Employee,
  getEmployee,
  getEmployeeByEmail,
  getSession,
  logAudit,
  seedIfEmpty,
  setSession,
} from "./db";

interface AuthValue {
  user: Employee | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Employee>;
  logout: () => void;
  refresh: () => void;
}

const AuthCtx = createContext<AuthValue>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("no provider");
  },
  logout: () => {},
  refresh: () => {},
});

const INACTIVITY_MS = 30 * 60 * 1000; // 30 min auto-logout

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    const s = getSession();
    setUser(s ? getEmployee(s.userId) : null);
  };

  useEffect(() => {
    seedIfEmpty();
    refresh();
    setLoading(false);
    const onChange = () => refresh();
    window.addEventListener("ams:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ams:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setSession(null);
        setUser(null);
      }, INACTIVITY_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);

  const login = async (email: string, password: string) => {
    const emp = getEmployeeByEmail(email);
    if (!emp) throw new Error("No account with that email.");
    if (emp.status !== "Active") throw new Error("This account is inactive.");
    if (emp.password !== password) throw new Error("Incorrect password.");
    setSession({ userId: emp.id });
    setUser(emp);
    logAudit(emp.id, "LOGIN");
    return emp;
  };

  const logout = () => {
    if (user) logAudit(user.id, "LOGOUT");
    setSession(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
