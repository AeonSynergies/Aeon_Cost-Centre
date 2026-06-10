import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-[7px] text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-[#3266AD] text-white hover:bg-[#2a558f]",
        secondary: "border border-[#E8ECF4] bg-white text-[#64748B] hover:bg-[#F1F5F9]",
        danger: "bg-[#D85A30] text-white hover:bg-[#bf4d28]",
        success: "bg-[#1D9E75] text-white hover:bg-[#188563]",
        ghost: "text-[#64748B] hover:bg-[#F1F5F9]",
      },
      size: {
        default: "h-[34px] px-3.5",
        sm: "h-[28px] px-2.5 text-[11px]",
        icon: "h-[34px] w-[34px]",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
