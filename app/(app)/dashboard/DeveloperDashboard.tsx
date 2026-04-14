"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { StatusDot, type Status } from "@/components/ui/StatusDot";
import { AILeverageBar } from "@/components/AILeverageBar";
import { WORK_TYPE_META } from "@/types";
import { cn } from "@/lib/cn";

type MyAnalytics = {
  weekly_hours: {
    week_start: string;
    total_minutes: number;
    is_baseline: boolean;
    by_work_type: Record<string, number>;
  }[];
  ai_leverage_ratio: {
    spec_pct: number;
    build_pct: number;
    debug_pct: number;
    polish_pct: number;
    total_ai_minutes: number;
  };
  ai_leverage_ratio_prev_week: {
    spec_pct: number;
    build_pct: number;
    debug_pct: number;
    polish_pct: number;
  };
  burnout: {
    daily_avg_hours_7d: number;
    consecutive_long_days: number;
    weekend_sessions_4w: number;
    after_hours_sessions_4w: number;
    difficult_session_ratio_2w: number;
    status: Status;
  };
  this_week: {
    total_minutes: number;
    vs_baseline_minutes: number;
    by_work_type: Record<string, number>;
    sessions_count: number;
  };
  feedback_summary: {
    difficult_count: number;
    flowed_count: number;
    blocked_count: number;
    no_feedback_count: number;
  };
};

function fmtHM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export function DeveloperDashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<MyAnalytics>({
    queryKey: ["analytics", "my"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/my", { credentials: "include" });
      if (!r.ok) throw new Error("analytics");
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <main className="flex-1 px-5 py-10 text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {t("common_loading")}
      </main>
    );
  }

  const hasReal = data.weekly_hours.some((w) => w.total_minutes > 0 && !w.is_baseline);
  const thisWeekMin = data.this_week.total_minutes;
  const variance = data.this_week.vs_baseline_minutes;
  const maxWeek = Math.max(48 * 60, ...data.weekly_hours.map((w) => w.total_minutes || 0));

  const feedback = data.feedback_summary;
  const feedbackTotal =
    feedback.difficult_count + feedback.flowed_count + feedback.blocked_count;

  return (
    <main className="flex-1 px-5 py-6 space-y-5">
      <Card padding="md" className="text-center space-y-1">
        <p className="text-xs uppercase font-mono tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("dash_this_week")}
        </p>
        <h1 className="text-5xl font-heading text-ikigai-purple">
          {(thisWeekMin / 60).toFixed(1)}h
        </h1>
        <p
          className={cn(
            "text-sm",
            variance > 0 ? "text-ikigai-amber" : "text-ikigai-emerald"
          )}
        >
          {variance > 0
            ? `+${(variance / 60).toFixed(1)}h ${t("dash_over_target")}`
            : t("dash_within_target")}
        </p>
        {data.this_week.sessions_count > 0 && (
          <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("dash_sessions_in_projects", {
              count: data.this_week.sessions_count,
              projects: Object.keys(data.this_week.by_work_type).length || 0,
            })}
          </p>
        )}
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("dash_ai_leverage_label")}
          </h2>
          {data.ai_leverage_ratio.total_ai_minutes > 0 &&
            (data.ai_leverage_ratio.debug_pct > 30 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ikigai-amber/20 text-ikigai-amber">
                !
              </span>
            ) : data.ai_leverage_ratio.debug_pct > 0 &&
              data.ai_leverage_ratio.debug_pct < 15 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ikigai-emerald/20 text-ikigai-emerald">
                ✓
              </span>
            ) : null)}
        </div>
        <AILeverageBar minutesByType={data.this_week.by_work_type} />
        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["spec", "spec_pct"],
              ["build", "build_pct"],
              ["debug", "debug_pct"],
              ["polish", "polish_pct"],
            ] as const
          ).map(([w, key]) => {
            const pct = data.ai_leverage_ratio[key];
            const prev = data.ai_leverage_ratio_prev_week[key];
            const diff = pct - prev;
            return (
              <div key={w}>
                <div className="text-lg" aria-hidden>{WORK_TYPE_META[w].emoji}</div>
                <div className="font-mono text-sm tabular-nums">{pct}%</div>
                {diff !== 0 && (
                  <div
                    className={cn(
                      "text-[10px] font-mono",
                      diff > 0
                        ? "text-ikigai-amber"
                        : "text-ikigai-emerald"
                    )}
                  >
                    {diff > 0 ? "▲" : "▼"}
                    {Math.abs(diff)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {data.ai_leverage_ratio.total_ai_minutes > 0 &&
          data.ai_leverage_ratio.debug_pct > 30 && (
            <p className="text-xs text-ikigai-amber">{t("dash_ai_high_debug")}</p>
          )}
        {data.ai_leverage_ratio.total_ai_minutes > 0 &&
          data.ai_leverage_ratio.debug_pct > 0 &&
          data.ai_leverage_ratio.debug_pct < 15 && (
            <p className="text-xs text-ikigai-emerald">{t("dash_ai_good_spec")}</p>
          )}
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex items-center gap-2">
          <StatusDot status={data.burnout.status} />
          <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("dash_balance")}
          </h2>
        </div>
        <BurnoutRow
          emoji="🕐"
          label={t("dash_balance_daily")}
          value={`${data.burnout.daily_avg_hours_7d.toFixed(1)}h`}
        />
        <BurnoutRow
          emoji="📅"
          label={t("dash_balance_long")}
          value={String(data.burnout.consecutive_long_days)}
        />
        <BurnoutRow
          emoji="🏖️"
          label={t("dash_balance_weekend")}
          value={String(data.burnout.weekend_sessions_4w)}
        />
        <BurnoutRow
          emoji="🌙"
          label={t("dash_balance_after")}
          value={String(data.burnout.after_hours_sessions_4w)}
        />
        {feedbackTotal > 0 && (
          <p className="text-xs font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
            😤 {feedback.difficult_count} · 😌 {feedback.flowed_count} · 🧱{" "}
            {feedback.blocked_count}
          </p>
        )}
        {data.burnout.status !== "green" && (
          <p className="text-xs text-ikigai-amber">{t("dash_balance_break")}</p>
        )}
      </Card>

      <Card padding="md" className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("dash_trend")}
        </h2>
        <div className="flex items-end gap-1 h-32">
          {data.weekly_hours.map((w) => {
            const pct = Math.max(
              2,
              Math.round((w.total_minutes / maxWeek) * 100)
            );
            return (
              <div
                key={w.week_start}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${w.week_start}: ${fmtHM(w.total_minutes)}`}
              >
                <div
                  className={cn(
                    "w-full rounded-sm",
                    w.is_baseline
                      ? "bg-ikigai-purple/30"
                      : "bg-ikigai-purple"
                  )}
                  style={{
                    height: `${pct}%`,
                    backgroundImage: w.is_baseline
                      ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(255,255,255,0.35) 4px 6px)"
                      : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
        <p className="text-[10px] font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50">
          {t("dash_baseline_weeks")}: {" "}
          <span className="inline-block w-3 h-3 align-middle bg-ikigai-purple/30" />
        </p>
        {!hasReal && (
          <p className="text-xs text-center text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("dash_empty_prompt")}
          </p>
        )}
      </Card>
    </main>
  );
}

function BurnoutRow({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span aria-hidden>{emoji}</span>
        <span>{label}</span>
      </span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
