"use client";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useTranslation();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-black/[0.05] dark:bg-white/[0.06] text-xs font-mono p-0.5",
        className
      )}
      role="tablist"
    >
      {(["es", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="tab"
          aria-selected={language === lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-3 py-1 rounded-full transition-colors",
            language === lang
              ? "bg-ikigai-purple text-white"
              : "text-ikigai-dark/70 dark:text-ikigai-cream/70"
          )}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
