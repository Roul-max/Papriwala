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
  // Use admin session if present, otherwise fall back to customer session
  const isAdmin = !!localStorage.getItem("adminRole") && localStorage.getItem("adminRole") !== "Customer";
  const role  = isAdmin
    ? localStorage.getItem("adminRole") || ""
    : localStorage.getItem("customerRole") || "Customer";
  const token = isAdmin
    ? localStorage.getItem("sessionToken") || ""
    : localStorage.getItem("customerToken") || "";

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
    if (isAdmin) {
      ["adminRole","adminName","sessionToken","employeeId","adminAvatar","accessPermissions"].forEach(k => localStorage.removeItem(k));
      window.location.replace("/admin/login");
    } else {
      ["customerRole","customerName","customerToken","customerId","customerAvatar","employeePhone","isNewCustomer"].forEach(k => localStorage.removeItem(k));
      window.location.replace("/login");
    }
  }

  return response;
}
