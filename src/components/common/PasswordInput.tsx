"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Password input with a show/hide eye toggle. Mirrors the standard Input styling. */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            "h-[34px] w-full rounded-[7px] border border-[#E8ECF4] bg-white px-3 pr-9 text-[13px] text-[#0F1629] outline-none transition-all duration-150 placeholder:text-[#94A3B8] focus:border-[#3266AD] disabled:bg-[#F1F5F9]",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
        >
          {show ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
