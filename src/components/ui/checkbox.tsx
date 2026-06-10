import * as React from "react";
import { cn } from "@/lib/utils";

/** Lightweight styled checkbox over the native input. */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn("h-3.5 w-3.5 accent-[#3266AD]", className)}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
