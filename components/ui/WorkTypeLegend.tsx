"use client";

import { useState } from "react";
import { WORK_TYPE_META, type WorkType } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { WorkTypeDot } from "./WorkTypeDot";

const ORDER: WorkType[] = [
  "spec", "build", "debug", "polish",
  "arch", "client", "meeting", "admin", "other",
];

export function WorkTypeLegend() {
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("worktype_legend_open")}
        className="w-6 h-6 rounded-full border border-black/15 dark:border-white/20 text-xs font-mono text-ikigai-dark/70 dark:text-ikigai-cream/70 hover:bg-black/5 dark:hover:bg-white/5"
      >
        ?
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-lg p-3 z-30 space-y-1.5">
            {ORDER.map((w) => {
              const meta = WORK_TYPE_META[w];
              return (
                <div key={w} className="flex items-center gap-2 text-sm">
                  <WorkTypeDot workType={w} />
                  <span>{language === "en" ? meta.label_en : meta.label_es}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
