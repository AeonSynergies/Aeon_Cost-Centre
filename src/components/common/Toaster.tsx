"use client";

import { useToastStore } from "@/store/toastStore";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-[8px] border border-[#E8ECF4] bg-white px-3.5 py-2.5 text-[12px] shadow-lg"
        >
          {t.tone === "success" ? (
            <CheckCircle2 size={15} className="text-[#1D9E75]" />
          ) : (
            <AlertCircle size={15} className="text-[#D85A30]" />
          )}
          <span className="text-[#0F1629]">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-1 text-[#94A3B8] hover:text-[#0F1629]"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}
