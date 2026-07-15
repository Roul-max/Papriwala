import { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import { broadcast } from "./ws.js";
import crypto from "crypto";

// ─── Server-side session store ────────────────────────────────────────────────
// Maps sessionToken → { role, employeeId, createdAt }
// Tokens expire after 12 hours of inactivity.
export interface Session {
  role: string;
  employeeId?: string;
  name: string;
  createdAt: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const sessionStore = new Map<string, Session>();

export function createSession(role: string, name: string, employeeId?: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessionStore.set(token, { role, name, employeeId, createdAt: Date.now() });
  return token;
}

export function destroySession(token: string): void {
  sessionStore.delete(token);
}

function getSession(token: string): Session | null {
  const session = sessionStore.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessionStore.delete(token);
    return null;
  }
  // Refresh TTL on activity
  session.createdAt = Date.now();
  return session;
}

// ─── Public paths that skip auth ─────────────────────────────────────────────
// Mobile QR portal posts orders and reads products/categories without a session.
const PUBLIC_PATHS = new Set([
  "/health",
  "/auth/login",
  "/auth/send-otp",
  "/auth/verify-otp",
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
  if (path.includes("employees") || path.includes("attendance")) return "Employees";
  if (path.includes("settings"))                               return "Settings";
  return "POS Billing";
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export function roleAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Strip /api prefix for matching
  const cleanPath = req.path.replace(/^\/api/, "");

  // Allow public paths without a session
  if (PUBLIC_PATHS.has(cleanPath) || PUBLIC_PATHS.has(req.path)) {
    return next();
  }

  // Also allow the forbidden-alert broadcast endpoint (called by frontend before redirect)
  if (req.path === "/auth/forbidden-alert" || cleanPath === "/auth/forbidden-alert") {
    return next();
  }

  // Mobile portal: allow GET on menu-browsing paths and POST /orders from QR checkout
  if (req.method === "GET" && isPublicMobilePath(req.path)) return next();
  if (req.method === "POST" && req.path === "/orders" && !req.header("X-Session-Token")) return next();

  // ── Validate session token ──────────────────────────────────────────────────
  const token = req.header("X-Session-Token") || "";
  const session = token ? getSession(token) : null;

  if (!session) {
    return res.status(401).json({ error: "Unauthorized: invalid or expired session." });
  }

  const { role } = session;

  // Attach session to request for downstream handlers
  (req as any).session = session;

  // Admin has unrestricted access
  if (role === "Admin") return next();

  // ── Employee RBAC enforcement ───────────────────────────────────────────────
  const permissions: Record<string, Record<string, string>> =
    (db.settings as any)?.permissions?.[role] || {};

  const pathModule = deriveModule(req.path, req.method);
  const access = (permissions as any)[pathModule] || "Full Access";

  if (access === "Hidden") {
    broadcast({
      type: "FORBIDDEN_ACCESS_ATTEMPT",
      payload: { path: req.path, role, timestamp: new Date().toISOString() },
    });
    return res.status(403).json({ error: "403 Forbidden: Module access is hidden." });
  }

  if (access === "Read-Only" && ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return res.status(403).json({ error: "403 Forbidden: Read-Only access cannot modify data." });
  }

  next();
}
