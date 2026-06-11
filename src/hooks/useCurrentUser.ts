"use client";

import useSWRImmutable from "swr/immutable";
import { apiGet } from "@/lib/api-client";

export interface CurrentUser { id: string; name: string; email: string; role: string; departmentId: string | null }

/** Current session user (cached). Use for client-side role gating of UI. */
export function useCurrentUser() {
  const { data } = useSWRImmutable<CurrentUser>("/api/me", apiGet);
  const role = data?.role ?? "VIEWER";
  return { user: data, role, isAdmin: role === "ADMIN", canWrite: role === "ADMIN" || role === "MANAGER" };
}
