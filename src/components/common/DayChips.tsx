"use client";

import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]; // 0=Sun..6=Sat

/** Mon–Sun chips with active days filled blue. days = array of 0-6. */
export function DayChips({ days }: { days: number[] }) {
  const set = new Set(days);
  return (
    <div className="flex gap-0.5">
      {DAYS.map((d, i) => (
        <span
          key={i}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-[3px] text-[8px] font-bold",
            set.has(i) ? "bg-[#3266AD] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"
          )}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

// Backwards-compatible alias.
export { DayChips as WorkingDayChips };
