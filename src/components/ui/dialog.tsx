"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  width = 520,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  width?: number;
  title: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(15,22,41,0.5)] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        style={{ maxWidth: width }}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-[#E8ECF4] bg-white shadow-lg focus:outline-none",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E8ECF4] px-5 py-3.5">
          <DialogPrimitive.Title className="text-[15px] font-bold text-[#0F1629]">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded p-1 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F1629]">
            <X size={16} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("max-h-[70vh] overflow-y-auto px-5 py-4", className)}>{children}</div>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[#E8ECF4] px-5 py-3">
      {children}
    </div>
  );
}
