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
  const role  = localStorage.getItem("adminRole")    || "";
  const token = localStorage.getItem("sessionToken") || "";

  const headers = new Headers(init.headers ?? {});
  if (role)  headers.set("X-User-Role",     role);
  if (token) headers.set("X-Session-Token", token);

  const response = await fetch(input, { ...init, headers });

  // Server invalidated our session — force re-login
  if (response.status === 401) {
    localStorage.clear();
    window.location.replace("/admin/login");
  }

  return response;
}
