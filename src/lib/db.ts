// In-browser data layer (localStorage). Mirrors the requested SQL schema.
// Swap this file's functions to hit your Node/Express + MySQL backend later.

export type Role = "Admin" | "Employee";
export type EmployeeStatus = "Active" | "Inactive";
export type AttendanceStatus = "Present" | "Late" | "Absent" | "On Leave";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";
export type LeaveType = "Sick" | "Casual" | "Annual" | "Unpaid";

export interface Employee {
  id: string; // EmployeeID
  name: string;
  email: string;
  password: string;
  department: string;
  role: Role;
  status: EmployeeStatus;
  joinedAt: string; // ISO
}

export interface BreakSpan {
  start: string; // ISO
  end: string | null; // ISO or null (active)
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // ISO
  checkOut: string | null; // ISO
  breaks: BreakSpan[];
  status: AttendanceStatus;
  note?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: LeaveStatus;
  reason: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  ts: string;
  actorId: string;
  action: string;
  target?: string;
}

const K = {
  employees: "ams.employees",
  attendance: "ams.attendance",
  leaves: "ams.leaves",
  session: "ams.session",
  audit: "ams.audit",
  seeded: "ams.seeded.v1",
};

const uid = () => Math.random().toString(36).slice(2, 10);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new CustomEvent("ams:change", { detail: { key } }));
}

// ---------- Seed ----------
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(K.seeded)) return;

  const today = new Date();
  const iso = (d: Date) => d.toISOString();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const at = (d: Date, h: number, m = 0) => {
    const x = new Date(d);
    x.setHours(h, m, 0, 0);
    return iso(x);
  };

  const employees: Employee[] = [
    {
      id: "EMP001",
      name: "Admin User",
      email: "admin@company.com",
      password: "admin123",
      department: "Management",
      role: "Admin",
      status: "Active",
      joinedAt: iso(new Date(2023, 0, 15)),
    },
    {
      id: "EMP002",
      name: "Alice Johnson",
      email: "alice@company.com",
      password: "password123",
      department: "Engineering",
      role: "Employee",
      status: "Active",
      joinedAt: iso(new Date(2023, 2, 1)),
    },
    {
      id: "EMP003",
      name: "Bob Smith",
      email: "bob@company.com",
      password: "password123",
      department: "Design",
      role: "Employee",
      status: "Active",
      joinedAt: iso(new Date(2023, 5, 12)),
    },
    {
      id: "EMP004",
      name: "Carol Davis",
      email: "carol@company.com",
      password: "password123",
      department: "Engineering",
      role: "Employee",
      status: "Active",
      joinedAt: iso(new Date(2024, 1, 20)),
    },
    {
      id: "EMP005",
      name: "David Lee",
      email: "david@company.com",
      password: "password123",
      department: "Sales",
      role: "Employee",
      status: "Inactive",
      joinedAt: iso(new Date(2022, 8, 5)),
    },
  ];

  const attendance: AttendanceRecord[] = [];
  for (let i = 14; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    for (const emp of employees.filter((e) => e.role === "Employee" && e.status === "Active")) {
      const late = Math.random() < 0.2;
      const absent = Math.random() < 0.08;
      if (absent) {
        attendance.push({
          id: uid(),
          employeeId: emp.id,
          date: ymd(d),
          checkIn: null,
          checkOut: null,
          breaks: [],
          status: "Absent",
        });
        continue;
      }
      const inH = late ? 9 : 8;
      const inM = late ? 25 + Math.floor(Math.random() * 30) : 45 + Math.floor(Math.random() * 15);
      const outH = 17 + Math.floor(Math.random() * 2);
      const outM = Math.floor(Math.random() * 55);
      attendance.push({
        id: uid(),
        employeeId: emp.id,
        date: ymd(d),
        checkIn: at(d, inH, inM),
        checkOut: at(d, outH, outM),
        breaks: [{ start: at(d, 12, 30), end: at(d, 13, 15) }],
        status: late ? "Late" : "Present",
      });
    }
  }

  const leaves: LeaveRequest[] = [
    {
      id: uid(),
      employeeId: "EMP002",
      type: "Annual",
      startDate: ymd(new Date(today.getFullYear(), today.getMonth() + 1, 5)),
      endDate: ymd(new Date(today.getFullYear(), today.getMonth() + 1, 9)),
      status: "Pending",
      reason: "Family vacation",
      createdAt: iso(today),
    },
    {
      id: uid(),
      employeeId: "EMP003",
      type: "Sick",
      startDate: ymd(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 3))),
      endDate: ymd(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 3))),
      status: "Approved",
      reason: "Flu",
      createdAt: iso(today),
    },
  ];

  write(K.employees, employees);
  write(K.attendance, attendance);
  write(K.leaves, leaves);
  write(K.audit, [] as AuditLog[]);
  window.localStorage.setItem(K.seeded, "1");
}

// ---------- Employees ----------
export const getEmployees = () => read<Employee[]>(K.employees, []);
export const getEmployee = (id: string) => getEmployees().find((e) => e.id === id) ?? null;
export const getEmployeeByEmail = (email: string) =>
  getEmployees().find((e) => e.email.toLowerCase() === email.toLowerCase()) ?? null;
export function saveEmployee(emp: Employee) {
  const list = getEmployees();
  const idx = list.findIndex((e) => e.id === emp.id);
  if (idx >= 0) list[idx] = emp;
  else list.push(emp);
  write(K.employees, list);
}
export function deleteEmployee(id: string) {
  write(K.employees, getEmployees().filter((e) => e.id !== id));
}
export function nextEmployeeId() {
  const nums = getEmployees()
    .map((e) => parseInt(e.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return "EMP" + String(next).padStart(3, "0");
}

// ---------- Attendance ----------
export const getAttendance = () => read<AttendanceRecord[]>(K.attendance, []);
export const getAttendanceFor = (employeeId: string) =>
  getAttendance().filter((a) => a.employeeId === employeeId);
export const getTodayRecord = (employeeId: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return getAttendance().find((a) => a.employeeId === employeeId && a.date === today) ?? null;
};
export function saveAttendance(rec: AttendanceRecord) {
  const list = getAttendance();
  const idx = list.findIndex((a) => a.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.push(rec);
  write(K.attendance, list);
}
export function deleteAttendance(id: string) {
  write(K.attendance, getAttendance().filter((a) => a.id !== id));
}
export function clockIn(employeeId: string): AttendanceRecord {
  const existing = getTodayRecord(employeeId);
  if (existing && existing.checkIn) throw new Error("Already clocked in today.");
  const now = new Date();
  const late = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
  const rec: AttendanceRecord = existing ?? {
    id: uid(),
    employeeId,
    date: now.toISOString().slice(0, 10),
    checkIn: null,
    checkOut: null,
    breaks: [],
    status: "Present",
  };
  rec.checkIn = now.toISOString();
  rec.status = late ? "Late" : "Present";
  saveAttendance(rec);
  return rec;
}
export function clockOut(employeeId: string): AttendanceRecord {
  const rec = getTodayRecord(employeeId);
  if (!rec || !rec.checkIn) throw new Error("You must clock in first.");
  if (rec.checkOut) throw new Error("Already clocked out.");
  // Close any open break
  const open = rec.breaks.find((b) => !b.end);
  if (open) open.end = new Date().toISOString();
  rec.checkOut = new Date().toISOString();
  saveAttendance(rec);
  return rec;
}
export function startBreak(employeeId: string): AttendanceRecord {
  const rec = getTodayRecord(employeeId);
  if (!rec || !rec.checkIn) throw new Error("Clock in before starting a break.");
  if (rec.checkOut) throw new Error("Already clocked out for today.");
  if (rec.breaks.some((b) => !b.end)) throw new Error("A break is already active.");
  rec.breaks.push({ start: new Date().toISOString(), end: null });
  saveAttendance(rec);
  return rec;
}
export function endBreak(employeeId: string): AttendanceRecord {
  const rec = getTodayRecord(employeeId);
  if (!rec) throw new Error("No active session.");
  const open = rec.breaks.find((b) => !b.end);
  if (!open) throw new Error("No active break.");
  open.end = new Date().toISOString();
  saveAttendance(rec);
  return rec;
}

// ---------- Leaves ----------
export const getLeaves = () => read<LeaveRequest[]>(K.leaves, []);
export function saveLeave(l: LeaveRequest) {
  const list = getLeaves();
  const idx = list.findIndex((x) => x.id === l.id);
  if (idx >= 0) list[idx] = l;
  else list.push(l);
  write(K.leaves, list);
}
export function createLeave(input: Omit<LeaveRequest, "id" | "status" | "createdAt">) {
  const l: LeaveRequest = {
    ...input,
    id: uid(),
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  saveLeave(l);
  return l;
}
export function deleteLeave(id: string) {
  write(K.leaves, getLeaves().filter((l) => l.id !== id));
}

// ---------- Session ----------
export const getSession = () => read<{ userId: string } | null>(K.session, null);
export const setSession = (s: { userId: string } | null) => {
  if (s) write(K.session, s);
  else {
    if (typeof window !== "undefined") window.localStorage.removeItem(K.session);
    window.dispatchEvent(new CustomEvent("ams:change", { detail: { key: K.session } }));
  }
};

// ---------- Audit ----------
export const getAudit = () => read<AuditLog[]>(K.audit, []);
export function logAudit(actorId: string, action: string, target?: string) {
  const list = getAudit();
  list.unshift({ id: uid(), ts: new Date().toISOString(), actorId, action, target });
  write(K.audit, list.slice(0, 500));
}

// ---------- Metrics ----------
export function computeMs(rec: AttendanceRecord, now = Date.now()) {
  if (!rec.checkIn) return { workMs: 0, breakMs: 0 };
  const start = new Date(rec.checkIn).getTime();
  const end = rec.checkOut ? new Date(rec.checkOut).getTime() : now;
  let breakMs = 0;
  for (const b of rec.breaks) {
    const bs = new Date(b.start).getTime();
    const be = b.end ? new Date(b.end).getTime() : now;
    breakMs += Math.max(0, be - bs);
  }
  const workMs = Math.max(0, end - start - breakMs);
  return { workMs, breakMs };
}
export const STANDARD_DAY_MS = 8 * 60 * 60 * 1000;
