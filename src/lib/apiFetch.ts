/**
 * Central fetch wrapper — automatically injects RBAC auth headers on every
 * request so the server middleware can enforce role-based access control.
 *
 * Headers injected:
 *   X-User-Role      — role stored in localStorage after login
 *   X-Session-Token  — opaque token issued by /api/auth/login, validated
 *                      server-side (never trusted from client alone)
 */
export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const path = typeof input === "string" ? input : input.toString();
  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  const hasCustomerSession = !!localStorage.getItem("customerToken");
  const hasAdminSession = !!localStorage.getItem("adminRole") && localStorage.getItem("adminRole") !== "Customer" && !!localStorage.getItem("sessionToken");

  // Prefer the customer session on mobile/customer pages so a stale admin login
  // cannot hijack the request and trigger a 403 on customer-only screens.
  const useAdminSession = isAdminRoute && hasAdminSession && !path.startsWith("/api/auth/logout");
  const role = useAdminSession
    ? localStorage.getItem("adminRole") || ""
    : (hasCustomerSession ? localStorage.getItem("customerRole") || "Customer" : "");
  const token = useAdminSession
    ? localStorage.getItem("sessionToken") || ""
    : (hasCustomerSession ? localStorage.getItem("customerToken") || "" : "");

  const headers = new Headers(init.headers ?? {});
  if (role)  headers.set("X-User-Role",     role);
  if (token) headers.set("X-Session-Token", token);

  let response: Response;
  try {
    response = await fetch(input, { ...init, headers });
  } catch {
    throw new Error("Network error — please check your connection.");
  }

  // Session invalidated — redirect to appropriate login
  if (response.status === 401) {
    if (isAdminRoute) {
      ["adminRole","adminName","sessionToken","employeeId","adminAvatar","accessPermissions"].forEach(k => localStorage.removeItem(k));
      window.location.replace("/admin/login");
    } else {
      ["customerRole","customerName","customerToken","customerId","customerPhone","customerAvatar","employeePhone","isNewCustomer"].forEach(k => localStorage.removeItem(k));
      window.location.replace("/login");
    }
  }

  return response;
}
