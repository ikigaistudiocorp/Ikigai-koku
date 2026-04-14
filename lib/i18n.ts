"use client";

import { useEffect, useSyncExternalStore } from "react";
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

// skipHydration keeps persisted state out of the initial server render;
// useTranslation triggers rehydrate() once on the client.
export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: "es",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "koku-language",
      skipHydration: true,
    }
  )
);

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

const subscribe = (cb: () => void) => useLanguageStore.subscribe(cb);
const getSnapshot = () => useLanguageStore.getState().language;
const getServerSnapshot = (): Language => "es";

export function useTranslation() {
  const language = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Kick off localStorage rehydration once on mount. useSyncExternalStore
  // handles the re-render — no setState-in-effect, no mismatch.
  useEffect(() => {
    void useLanguageStore.persist.rehydrate();
  }, []);

  const t = (key: string, vars?: Vars): string => {
    const dict = (language === "en" ? en : es) as Record<string, string>;
    const fallback = es as Record<string, string>;
    const template = dict[key] ?? fallback[key] ?? key;
    return interpolate(template, vars);
  };

  return {
    t,
    language,
    setLanguage: useLanguageStore.getState().setLanguage,
  };
}
