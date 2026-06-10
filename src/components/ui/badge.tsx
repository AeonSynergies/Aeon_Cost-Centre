import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "purple"
  | "neutral";

const tones: Record<BadgeTone, string> = {
  success: "bg-[#E1F5EE] text-[#085041]",
  error: "bg-[#FAECE7] text-[#711B13]",
  warning: "bg-[#FAEEDA] text-[#633806]",
  info: "bg-[#E6F1FB] text-[#0C447C]",
  purple: "bg-[#EEEDFE] text-[#3C3489]",
  neutral: "bg-[#F1F5F9] text-[#475569]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
