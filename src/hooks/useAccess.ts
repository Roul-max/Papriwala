// Returns the access level for the current user's role on a given module.
// "Full Access" | "Read-Only" | "Hidden"
export function useAccess(module: string): "Full Access" | "Read-Only" | "Hidden" {
  const role = localStorage.getItem("adminRole") || "";
  if (!role) return "Hidden";
  if (role === "Admin") return "Full Access";
  const permissions = JSON.parse(localStorage.getItem("accessPermissions") || "{}");
  // Default to Hidden if module not explicitly granted — fail-safe
  return (permissions[role]?.[module] as "Full Access" | "Read-Only" | "Hidden") || "Hidden";
}
