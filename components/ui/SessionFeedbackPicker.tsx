"use client";

import type { SessionFeedback } from "@/types";
import { useTranslation } from "@/lib/i18n";

const OPTIONS: Array<{ key: SessionFeedback; emoji: string; translation: string }> = [
  { key: "difficult", emoji: "😤", translation: "feedback_difficult" },
  { key: "flowed", emoji: "😌", translation: "feedback_flowed" },
  { key: "blocked", emoji: "🧱", translation: "feedback_blocked" },
];

export function SessionFeedbackPicker({
  onSelect,
}: {
  onSelect: (feedback: SessionFeedback | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h3 className="text-center text-base font-medium">
        {t("feedback_label")}
      </h3>
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect(o.key)}
            className="flex items-center gap-3 w-full min-h-[64px] rounded-xl px-5 py-3 text-left border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 hover:border-ikigai-purple transition-colors"
          >
            <span className="text-2xl" aria-hidden>
              {o.emoji}
            </span>
            <span className="text-base">{t(o.translation)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="w-full text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60 underline"
      >
        {t("feedback_skip")}
      </button>
    </div>
  );
}
