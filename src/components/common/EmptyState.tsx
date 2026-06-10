"use client";

import * as React from "react";

export function EmptyState({
  icon,
  heading,
  subtext,
  cta,
}: {
  icon?: React.ReactNode;
  heading: string;
  subtext?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="text-[#94A3B8]">{icon}</div>
      <div className="text-[14px] font-semibold text-[#0F1629]">{heading}</div>
      {subtext && <div className="max-w-sm text-[12px] text-[#64748B]">{subtext}</div>}
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
