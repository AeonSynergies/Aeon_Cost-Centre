/**
 * Role-based access control helpers, usable on both server and client.
 * Roles: ADMIN | MANAGER | FINANCE | VIEWER.
 */
export type Role = "ADMIN" | "MANAGER" | "FINANCE" | "VIEWER";

export const can = {
  // Operations
  editResources: (r: Role) => r === "ADMIN" || r === "MANAGER",
  salaryRevisions: (r: Role) => r === "ADMIN" || r === "MANAGER",
  servicePricing: (r: Role) => r === "ADMIN",
  editClients: (r: Role) => r === "ADMIN",
  assignResources: (r: Role) => r === "ADMIN" || r === "MANAGER",
  // Finance
  revenueBilling: (r: Role) => r === "ADMIN" || r === "FINANCE",
  generateBilling: (r: Role) => r === "ADMIN",
  logUtilisation: (r: Role) => r === "ADMIN" || r === "MANAGER",
  approveUtilisation: (r: Role) => r === "ADMIN" || r === "MANAGER",
  // Admin
  systemSettings: (r: Role) => r === "ADMIN",
  manageUsers: (r: Role) => r === "ADMIN",
  auditLog: (r: Role) => r === "ADMIN",
  // Dashboards
  viewAnalytics: (r: Role) => r === "ADMIN" || r === "MANAGER" || r === "FINANCE",
};

/** Generic write gate used by most operations CRUD. */
export function canWrite(role: string | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
