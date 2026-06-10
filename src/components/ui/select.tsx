import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-[34px] w-full rounded-[7px] border border-[#E8ECF4] bg-white px-2.5 text-[13px] text-[#0F1629] outline-none transition-all duration-150 focus:border-[#3266AD]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
