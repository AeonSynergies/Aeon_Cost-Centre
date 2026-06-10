"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: "success" | "error") => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "success") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper usable outside React render. */
export function toast(message: string, tone: "success" | "error" = "success") {
  useToastStore.getState().push(message, tone);
}
