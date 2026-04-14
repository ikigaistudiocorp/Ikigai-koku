"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Member = { id: string; name: string; email: string; role: string };

// Matrix indexed as hours[userId][weeksAgo (1..8)].
type HoursMatrix = Record<string, Record<number, string>>;

const WEEKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function BaselineForm({ members }: { members: Member[] }) {
  const { t } = useTranslation();
  const router = useRouter();

  const initialHours = useMemo<HoursMatrix>(() => {
    const matrix: HoursMatrix = {};
    for (const m of members) {
      matrix[m.id] = {};
      for (const w of WEEKS) matrix[m.id][w] = "";
    }
    return matrix;
  }, [members]);

  const [hours, setHours] = useState<HoursMatrix>(initialHours);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (userId: string, week: number, value: string) => {
    setHours((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [week]: value },
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const entries: Array<{ user_id: string; weeks_ago: number; hours: number }> =
      [];
    for (const m of members) {
      for (const w of WEEKS) {
        const raw = hours[m.id][w];
        if (raw === "" || raw === null || raw === undefined) {
          setError(
            t("common_error") + ` — ${m.name} · ${weekLabel(w, t)}`
          );
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 80) {
          setError(t("common_error") + ` — ${m.name} · ${weekLabel(w, t)}`);
          return;
        }
        entries.push({ user_id: m.id, weeks_ago: w, hours: n });
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.replace("/clock");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-heading text-ikigai-purple">
          {t("onboarding_title")}
        </h1>
        <p className="text-base">{t("onboarding_subtitle")}</p>
        <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("onboarding_instruction")}
        </p>
      </header>

      <Card padding="sm" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 font-normal text-ikigai-dark/60 dark:text-ikigai-cream/60">
                &nbsp;
              </th>
              {members.map((m) => (
                <th
                  key={m.id}
                  className="py-2 px-2 font-medium whitespace-nowrap"
                >
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKS.map((w) => (
              <tr key={w} className="border-t border-black/[0.06] dark:border-white/[0.08]">
                <td className="py-2 pr-3 whitespace-nowrap text-ikigai-dark/70 dark:text-ikigai-cream/70 font-mono text-xs">
                  {weekLabel(w, t)}
                </td>
                {members.map((m) => (
                  <td key={m.id} className="py-2 px-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={80}
                      step={0.5}
                      required
                      value={hours[m.id][w]}
                      onChange={(e) => update(m.id, w, e.target.value)}
                      className="w-20 h-11 px-2 rounded-md border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 text-center text-base focus:outline-none focus:ring-2 focus:ring-ikigai-purple"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {error && (
        <p className="text-sm text-ikigai-rose" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={saving} fullWidth size="lg">
        {saving ? t("onboarding_saving") : t("onboarding_submit")}
      </Button>
    </form>
  );
}

function weekLabel(w: number, t: (k: string, v?: Record<string, string | number>) => string) {
  if (w === 1) return t("onboarding_week_label_one");
  return t("onboarding_week_label", { n: w });
}
