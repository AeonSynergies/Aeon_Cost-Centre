import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[72px] w-full rounded-[7px] border border-[#E8ECF4] bg-white px-3 py-2 text-[13px] text-[#0F1629] outline-none transition-all duration-150 placeholder:text-[#94A3B8] focus:border-[#3266AD]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
