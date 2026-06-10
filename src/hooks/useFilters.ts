"use client";

import { useOpsStore } from "@/store/filterStore";

/** Convenience accessor for the global period + filter state. */
export function useFilters() {
  const periodYear = useOpsStore((s) => s.periodYear);
  const periodMonth = useOpsStore((s) => s.periodMonth);
  const dateRange = useOpsStore((s) => s.dateRange);
  const setPeriod = useOpsStore((s) => s.setPeriod);
  const setDateRange = useOpsStore((s) => s.setDateRange);
  return { periodYear, periodMonth, dateRange, setPeriod, setDateRange, periodQuery: `year=${periodYear}&month=${periodMonth}` };
}
