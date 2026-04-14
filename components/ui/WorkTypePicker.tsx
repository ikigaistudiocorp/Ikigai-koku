"use client";

import { WORK_TYPE_META, type WorkType, type CustomWorkType } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Value =
  | { kind: "builtin"; workType: WorkType }
  | { kind: "custom"; customId: string };

type Props = {
  value: Value | null;
  onChange: (v: Value) => void;
  projectId?: string | null;
  customWorkTypes?: CustomWorkType[];
};

const AI_CYCLE: WorkType[] = ["spec", "build", "debug", "polish"];
const OTHER: WorkType[] = [
  "devops",
  "arch",
  "client",
  "meeting",
  "admin",
  "other",
];

export function WorkTypePicker({
  value,
  onChange,
  projectId,
  customWorkTypes = [],
}: Props) {
  const { t, language } = useTranslation();

  const scopedCustom = customWorkTypes.filter(
    (c) =>
      c.status === "active" &&
      (c.scope === "global" ||
        (c.scope === "project" && c.project_id === projectId))
  );

  const isSelectedBuiltin = (w: WorkType) =>
    value?.kind === "builtin" && value.workType === w;
  const isSelectedCustom = (id: string) =>
    value?.kind === "custom" && value.customId === id;

  const renderBuiltin = (w: WorkType) => {
    const meta = WORK_TYPE_META[w];
    const selected = isSelectedBuiltin(w);
    return (
      <button
        key={w}
        type="button"
        onClick={() => onChange({ kind: "builtin", workType: w })}
        className={cn(
          "flex items-center gap-3 w-full min-h-[64px] rounded-xl px-4 py-3 text-left border transition-colors",
          selected
            ? "border-ikigai-purple bg-ikigai-purple/10"
            : "border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
        )}
      >
        <span className="text-xl" aria-hidden>
          {meta.emoji}
        </span>
        <span className="text-base">
          {language === "en" ? meta.label_en : meta.label_es}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("worktype_group_ai")}
        </h3>
        <div className="grid grid-cols-2 gap-2">{AI_CYCLE.map(renderBuiltin)}</div>
      </div>

      {scopedCustom.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("custom_work_type_label")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {scopedCustom.map((c) => {
              const selected = isSelectedCustom(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    onChange({ kind: "custom", customId: c.id })
                  }
                  className={cn(
                    "flex items-center gap-3 w-full min-h-[64px] rounded-xl px-4 py-3 text-left border transition-colors",
                    selected
                      ? "border-ikigai-purple bg-ikigai-purple/10"
                      : "border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
                  )}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: c.color }}
                    aria-hidden
                  />
                  <span className="text-base">{c.name}</span>
                  <span className="ml-auto text-[10px] uppercase font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50">
                    {t("custom_work_type_label")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("worktype_group_other")}
        </h3>
        <div className="grid grid-cols-2 gap-2">{OTHER.map(renderBuiltin)}</div>
      </div>
    </div>
  );
}
