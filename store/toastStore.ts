"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "warning" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastStore = {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, variant = "info") =>
    set((s) => {
      const id = crypto.randomUUID();
      const toast = { id, message, variant };
      const next = [...s.toasts, toast].slice(-3);
      // Auto-dismiss in 4s.
      setTimeout(() => {
        useToastStore.getState().dismiss(id);
      }, 4000);
      return { toasts: next };
    }),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, variant: ToastVariant = "info") {
  useToastStore.getState().push(message, variant);
}
