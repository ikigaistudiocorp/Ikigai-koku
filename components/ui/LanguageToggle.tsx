"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useTranslation();
  return (
    <div
      role="tablist"
      className={`relative flex items-center rounded-full bg-black/[0.06] dark:bg-white/[0.08] p-0.5 text-sm font-light ${className}`}
    >
      <motion.div
        aria-hidden
        className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-ikigai-purple"
        animate={{ left: language === "es" ? "2px" : "calc(50%)" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      <button
        role="tab"
        aria-selected={language === "es"}
        type="button"
        onClick={() => setLanguage("es")}
        className={`relative z-10 px-3 py-1 rounded-full transition-colors ${
          language === "es" ? "text-white" : "text-ikigai-dark/60 dark:text-ikigai-cream/60"
        }`}
      >
        ES
      </button>
      <button
        role="tab"
        aria-selected={language === "en"}
        type="button"
        onClick={() => setLanguage("en")}
        className={`relative z-10 px-3 py-1 rounded-full transition-colors ${
          language === "en" ? "text-white" : "text-ikigai-dark/60 dark:text-ikigai-cream/60"
        }`}
      >
        EN
      </button>
    </div>
  );
}
