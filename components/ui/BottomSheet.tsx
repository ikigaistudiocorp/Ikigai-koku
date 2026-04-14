"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

export function BottomSheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-40 transition-opacity",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-t-2xl bg-ikigai-cream dark:bg-ikigai-card shadow-xl",
          "max-h-[85vh] overflow-auto p-5 pb-10 transition-transform",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mb-4" />
        {title && (
          <h2 className="text-lg font-heading mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
