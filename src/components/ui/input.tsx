import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-[34px] w-full rounded-[7px] border border-[#E8ECF4] bg-white px-3 text-[13px] text-[#0F1629] outline-none transition-all duration-150 placeholder:text-[#94A3B8] focus:border-[#3266AD] disabled:bg-[#F1F5F9]",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

// Re-export the split-out form atoms so `@/components/ui/input` stays a
// convenient entry point alongside the dedicated files.
export { Label } from "./label";
export { Select } from "./select";
export { Textarea } from "./textarea";
