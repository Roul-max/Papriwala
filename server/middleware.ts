import { Request, Response, NextFunction } from "express";
import { db, supabase } from "./db.js";
import { broadcast } from "./ws.js";
import crypto from "crypto";

// ─── Session interface ────────────────────────────────────────────────────────
export interface Session {
  role: string;
  employeeId?: string;
  name: string;
  createdAt: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// In-memory fallback (used only when Supabase is unavailable)
export const sessionStore = new Map<string, Session>();

export async function createSession(role: string, name: string, employeeId?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const session: Session = { role, name, employeeId, createdAt: Date.now() };
  if (supabase) {
    await supabase.from("sessions").insert({
      token,
      role,
      name,
      employee_id: employeeId || null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    }).then(() => {}).catch(() => {});
  }
  sessionStore.set(token, session);
  return token;
}

export async function destroySession(token: string): Promise<void> {
  sessionStore.delete(token);
  if (supabase) {
    try { await supabase.from("sessions").delete().eq("token", token); } catch {}
  }
}

async function getSession(token: string): Promise<Session | null> {
  // Try in-memory first (fast path)
  const mem = sessionStore.get(token);
  if (mem) {
    if (Date.now() - mem.createdAt > SESSION_TTL_MS) {
      sessionStore.delete(token);
      if (supabase) try { await supabase.from("sessions").delete().eq("token", token); } catch {}
      return null;
    }
    mem.createdAt = Date.now();
    return mem;
  }
  // Fallback: check Supabase (handles server restarts)
  if (supabase) {
    try {
      const { data } = await supabase.from("sessions").select("*").eq("token", token).single();
      if (!data) return null;
      if (new Date(data.expires_at).getTime() < Date.now()) {
        try { await supabase.from("sessions").delete().eq("token", token); } catch {}
        return null;
      }
      const session: Session = { role: data.role, name: data.name, employeeId: data.employee_id, createdAt: new Date(data.created_at).getTime() };
      sessionStore.set(token, session);
      return session;
    } catch { return null; }
  }
  return null;
}

export function checkRateLimit(_ip: string): { allowed: boolean } { return { allowed: true }; }
export function resetRateLimit(_ip: string): void {}

// ─── Public paths that skip auth ─────────────────────────────────────────────
// Mobile QR portal posts orders and reads products/categories without a session.
const PUBLIC_PATHS = new Set([
  "/health",
  "/auth/login",
  "/auth/set-password",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/guest-login",
]);

// Paths that are fully public (mobile menu portal — no admin session required)
function isPublicMobilePath(path: string): boolean {
  // GET requests to products, categories, product-variants are public (menu browsing)
  return (
    path.startsWith("/products") ||
    path.startsWith("/categories") ||
    path.startsWith("/product-variants")
  );
}

// ─── Module derivation from request path ─────────────────────────────────────
function deriveModule(path: string, method: string): string {
  // Inventory-specific write operations and the audit log
  if (path.includes("inventory-log"))                          return "Inventory";
  if (path.includes("/stock"))                                 return "Inventory";
  // Product reads are needed by POS — only writes (add/delete) are Inventory-gated
  if (path.match(/^\/products\/[^/]+$/) && ["DELETE"].includes(method)) return "Inventory";
  if (path === "/products" && method === "POST")               return "Inventory";
  if (path.includes("products") || path.includes("product-variants")) return "POS Billing";
  if (path.includes("categories"))                             return "Inventory";
  if (path.includes("orders"))                                 return "Orders";
  if (path.includes("expenses") || path.includes("dealers"))   return "Financial Reports";
  if (path.includes("employees") || path.includes("attendance") || path.includes("employee-sessions")) return "Employees";
  if (path.includes("settings"))                               return "Settings";
  if (path.includes("raw-material-purchases") || path.includes("notifications")) return "Financial Reports";
  return "POS Billing";
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function roleAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const cleanPath = req.path.replace(/^\/api/, "");

  if (PUBLIC_PATHS.has(cleanPath) || PUBLIC_PATHS.has(req.path)) return next();
  if (req.path === "/auth/forbidden-alert" || cleanPath === "/auth/forbidden-alert") return next();
  if (req.method === "GET" && isPublicMobilePath(req.path)) return next();
  if (req.method === "POST" && req.path === "/orders" && !req.header("X-Session-Token")) return next();
  if (req.path === "/reviews" || req.path.startsWith("/reviews")) return next();

  const token = req.header("X-Session-Token") || "";
  const session = token ? await getSession(token) : null;

  if (!session) return res.status(401).json({ error: "Unauthorized: invalid or expired session." });

  (req as any).session = session;
  const { role } = session;

  if (role === "Admin" || role === "Customer") return next();

  const permissions: Record<string, Record<string, string>> = (db.settings as any)?.permissions?.[role] || {};
  const pathModule = deriveModule(req.path, req.method);
  const access = (permissions as any)[pathModule] || "Full Access";

  if (access === "Hidden") {
    broadcast({ type: "FORBIDDEN_ACCESS_ATTEMPT", payload: { path: req.path, role, timestamp: new Date().toISOString() } });
    return res.status(403).json({ error: "403 Forbidden: Module access is hidden." });
  }
  if (access === "Read-Only" && ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return res.status(403).json({ error: "403 Forbidden: Read-Only access cannot modify data." });
  }
  next();
}
