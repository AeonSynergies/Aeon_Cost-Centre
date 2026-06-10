"use client";

import { initials } from "@/lib/utils";

export function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F1FB] text-[10px] font-bold text-[#3266AD]">
      {initials(name)}
    </span>
  );
}
