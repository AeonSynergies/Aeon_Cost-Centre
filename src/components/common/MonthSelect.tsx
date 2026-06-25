"use client";

import { Select } from "@/components/ui/input";

export const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Month dropdown (shows month names, stores 1-12). */
export function MonthSelect({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {MONTH_NAMES_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
    </Select>
  );
}

/** Year dropdown (2025–2027). */
export function YearSelect({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
    </Select>
  );
}
