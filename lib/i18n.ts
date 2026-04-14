"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { es } from "@/translations/es";
import { en } from "@/translations/en";

export type Language = "es" | "en";
export type TranslationKey = keyof typeof es | keyof typeof en;

type LanguageStore = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: "es",
      setLanguage: (language) => set({ language }),
    }),
    { name: "koku-language" }
  )
);

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const t = (key: string, vars?: Vars): string => {
    const dict = (language === "en" ? en : es) as Record<string, string>;
    const fallback = es as Record<string, string>;
    const template = dict[key] ?? fallback[key] ?? key;
    return interpolate(template, vars);
  };

  return { t, language, setLanguage };
}
