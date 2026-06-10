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
