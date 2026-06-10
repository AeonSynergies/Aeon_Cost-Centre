import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";
