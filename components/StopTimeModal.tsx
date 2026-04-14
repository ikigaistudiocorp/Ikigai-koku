"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  startedAt: string;
  afterHoursEnd?: string | null;
  onConfirm: (endedAt: string | null) => void;
  onCancel: () => void;
};

type Choice = "now" | "afterhours" | "custom";

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function fromLocalDatetimeInput(s: string): Date {
  return new Date(s);
}

function afterHoursCandidate(startedAt: string, afterHoursEnd: string): Date | null {
  const start = new Date(startedAt);
  const [hh, mm] = afterHoursEnd.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const candidate = new Date(start);
  candidate.setHours(hh, mm, 0, 0);
  if (candidate <= start) candidate.setDate(candidate.getDate() + 1);
  const now = new Date();
  if (candidate > now || candidate <= start) return null;
  return candidate;
}

export function StopTimeModal({ startedAt, afterHoursEnd, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<Choice>("now");
  const afterHoursDate = useMemo(
    () => (afterHoursEnd ? afterHoursCandidate(startedAt, afterHoursEnd) : null),
    [startedAt, afterHoursEnd]
  );
  const [customValue, setCustomValue] = useState(() => toLocalDatetimeInput(new Date()));

  const start = new Date(startedAt);
  const now = new Date();
  let invalid = false;
  let resolvedEndedAt: string | null = null;
  if (choice === "now") {
    resolvedEndedAt = null; // Server defaults to NOW()
  } else if (choice === "afterhours") {
    if (!afterHoursDate) invalid = true;
    else resolvedEndedAt = afterHoursDate.toISOString();
  } else {
    const d = fromLocalDatetimeInput(customValue);
    if (!Number.isFinite(d.getTime()) || d <= start || d > now) invalid = true;
    else resolvedEndedAt = d.toISOString();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6">
      <Card padding="lg" className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-heading">{t("stop_when_title")}</h2>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="radio"
            name="stop-when"
            checked={choice === "now"}
            onChange={() => setChoice("now")}
          />
          <span>{t("stop_when_now")}</span>
        </label>

        {afterHoursDate && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="radio"
              name="stop-when"
              checked={choice === "afterhours"}
              onChange={() => setChoice("afterhours")}
            />
            <span>
              {t("stop_when_afterhours")}
              <span className="ml-2 font-mono text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                ({afterHoursDate.toLocaleString()})
              </span>
            </span>
          </label>
        )}

        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="stop-when"
              checked={choice === "custom"}
              onChange={() => setChoice("custom")}
            />
            <span>{t("stop_when_custom")}</span>
          </span>
          {choice === "custom" && (
            <input
              type="datetime-local"
              value={customValue}
              min={toLocalDatetimeInput(start)}
              max={toLocalDatetimeInput(now)}
              onChange={(e) => setCustomValue(e.target.value)}
              className="h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
          )}
        </label>

        {invalid && (
          <p className="text-xs text-red-600">{t("stop_when_invalid")}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" fullWidth onClick={onCancel}>
            {t("stop_when_cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            disabled={invalid}
            onClick={() => onConfirm(resolvedEndedAt)}
          >
            {t("stop_when_confirm")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
