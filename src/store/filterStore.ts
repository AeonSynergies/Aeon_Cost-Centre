"use client";

import { create } from "zustand";

export type DateRange = "Week" | "Month" | "Quarter" | "Year" | "Till Date" | "Custom";

interface OpsState {
  periodYear: number;
  periodMonth: number; // 1-12
  dateRange: DateRange;
  setPeriod: (year: number, month: number) => void;
  setDateRange: (r: DateRange) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const now = new Date();

export const useOpsStore = create<OpsState>((set) => ({
  periodYear: now.getFullYear(),
  periodMonth: now.getMonth() + 1,
  dateRange: "Month",
  setPeriod: (periodYear, periodMonth) => set({ periodYear, periodMonth }),
  setDateRange: (dateRange) => set({ dateRange }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
