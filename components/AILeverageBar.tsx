"use client";

import { WORK_TYPE_META, AI_CYCLE_WORK_TYPES, type WorkType } from "@/types";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n";

// Compact 4-segment stacked bar. Expects minutes per AI-cycle work type;
// non-AI types are ignored by design (spec defines the ratio this way).
export function AILeverageBar({
  minutesByType,
  className,
}: {
  minutesByType: Record<string, number>;
  className?: string;
}) {
  const { language } = useTranslation();
  const cycle = AI_CYCLE_WORK_TYPES.map((w) => ({
    w,
    m: minutesByType[w] ?? 0,
  }));
  const total = cycle.reduce((s, r) => s + r.m, 0);

  if (total === 0) {
    return (
      <div
        className={cn(
          "h-3 rounded-full bg-black/10 dark:bg-white/10",
          className
        )}
      />
    );
  }

  return (
    <div className={cn("flex h-3 rounded-full overflow-hidden", className)}>
      {cycle.map(({ w, m }) => {
        if (m === 0) return null;
        const pct = (m / total) * 100;
        return (
          <div
            key={w}
            className={cn("h-full", WORK_TYPE_META[w as WorkType].color)}
            style={{ width: `${pct}%` }}
            title={`${language === "en" ? WORK_TYPE_META[w as WorkType].label_en : WORK_TYPE_META[w as WorkType].label_es} ${Math.round(pct)}%`}
          />
        );
      })}
    </div>
  );
}

export function aiLeverageRatio(
  minutesByType: Record<string, number>
): Record<WorkType, number> {
  const cycle = AI_CYCLE_WORK_TYPES.map((w) => ({ w, m: minutesByType[w] ?? 0 }));
  const total = cycle.reduce((s, r) => s + r.m, 0);
  const out = {} as Record<WorkType, number>;
  for (const { w, m } of cycle) {
    out[w as WorkType] = total === 0 ? 0 : Math.round((m / total) * 100);
  }
  return out;
}
