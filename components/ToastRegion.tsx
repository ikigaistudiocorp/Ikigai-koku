"use client";

import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/cn";

const STYLES: Record<string, string> = {
  success: "bg-ikigai-emerald text-white",
  warning: "bg-ikigai-amber text-white",
  error: "bg-ikigai-rose text-white",
  info: "bg-ikigai-dark text-white dark:bg-ikigai-cream dark:text-ikigai-dark",
};

export function ToastRegion() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 flex flex-col gap-2 px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            "text-sm rounded-full px-4 py-2 shadow-lg max-w-[90vw] truncate",
            STYLES[t.variant] ?? STYLES.info
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
