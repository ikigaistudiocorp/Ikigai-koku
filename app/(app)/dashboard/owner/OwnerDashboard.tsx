"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { StatusDot, type Status } from "@/components/ui/StatusDot";
import { AILeverageBar } from "@/components/AILeverageBar";
import { WorkTypeLegend } from "@/components/ui/WorkTypeLegend";
import { cn } from "@/lib/cn";

type TeamAnalytics = {
  members: Array<{
    user_id: string;
    name: string;
    this_week_minutes: number;
    utilization_pct: number;
    burnout_status: Status;
    ai_leverage_ratio: {
      spec_pct: number;
      build_pct: number;
      debug_pct: number;
      polish_pct: number;
    };
    feedback_sentiment:
      | "positive"
      | "neutral"
      | "negative"
      | "insufficient_data";
  }>;
  team_avg_hours_this_week: number;
  hire_signal: {
    utilization_weeks_over_85: number;
    burnout_amber_or_red_count: number;
    status: Status;
  };
  capacity_trend: Array<{
    week_start: string;
    members: Array<{
      user_id: string;
      name: string;
      total_minutes: number;
      is_baseline: boolean;
    }>;
  }>;
};

const PIPELINE_KEY = "koku-hire-pipeline-toggle";

export function OwnerDashboard() {
  const { t } = useTranslation();
  const [pipeline, setPipeline] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PIPELINE_KEY) === "true";
  });

  const { data } = useQuery<TeamAnalytics>({
    queryKey: ["analytics", "team"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/team", { credentials: "include" });
      if (!r.ok) throw new Error("team");
      return r.json();
    },
    staleTime: 30_000,
  });

  if (!data) {
    return (
      <main className="flex-1 px-5 py-10 text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {t("common_loading")}
      </main>
    );
  }

  const signalStatusForDisplay: Status =
    data.hire_signal.status === "red" && pipeline
      ? "red"
      : data.hire_signal.status === "red" && !pipeline
        ? "amber"
        : data.hire_signal.status;

  return (
    <main className="flex-1 px-5 py-6 space-y-5">
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg flex items-center gap-2">
            <StatusDot status={signalStatusForDisplay} size="lg" />
            {t("hire_signal_label")}
          </h2>
          <span
            className={cn(
              "text-xs font-mono uppercase px-2 py-0.5 rounded-full",
              signalStatusForDisplay === "red"
                ? "bg-ikigai-rose/15 text-ikigai-rose"
                : signalStatusForDisplay === "amber"
                  ? "bg-ikigai-amber/15 text-ikigai-amber"
                  : "bg-ikigai-emerald/15 text-ikigai-emerald"
            )}
          >
            {t(`hire_signal_${signalStatusForDisplay}`)}
          </span>
        </div>

        <ul className="text-sm space-y-1">
          <li className="flex items-center gap-2">
            <StatusDot
              status={
                data.hire_signal.utilization_weeks_over_85 >= 6
                  ? "red"
                  : data.hire_signal.utilization_weeks_over_85 >= 4
                    ? "amber"
                    : "green"
              }
              size="sm"
            />
            <span>
              {">85%"} — {data.hire_signal.utilization_weeks_over_85}w
            </span>
          </li>
          <li className="flex items-center gap-2">
            <StatusDot
              status={
                data.hire_signal.burnout_amber_or_red_count >= 1
                  ? "amber"
                  : "green"
              }
              size="sm"
            />
            <span>
              {data.hire_signal.burnout_amber_or_red_count} burnout
            </span>
          </li>
          <li className="flex items-center gap-2">
            <StatusDot status={pipeline ? "amber" : "green"} size="sm" />
            <label className="flex-1 flex items-center justify-between gap-3">
              <span>{t("owner_dash_pipeline_q")}</span>
              <input
                type="checkbox"
                checked={pipeline}
                onChange={(e) => {
                  setPipeline(e.target.checked);
                  if (typeof window !== "undefined") {
                    localStorage.setItem(
                      PIPELINE_KEY,
                      e.target.checked ? "true" : "false"
                    );
                  }
                }}
                className="w-5 h-5"
              />
            </label>
          </li>
        </ul>

        {signalStatusForDisplay === "red" && (
          <p className="text-sm text-ikigai-rose">
            {t("owner_dash_hire_message_red")}
          </p>
        )}
        {signalStatusForDisplay === "amber" && (
          <p className="text-sm text-ikigai-amber">
            {t("owner_dash_hire_message_amber")}
          </p>
        )}
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("owner_dash_team")}
          </h2>
          <WorkTypeLegend />
        </div>
        <ul className="space-y-3">
          {data.members.map((m) => (
            <li key={m.user_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{m.name}</span>
                <span className="font-mono tabular-nums">
                  {(m.this_week_minutes / 60).toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                <span className="flex items-center gap-1">
                  <StatusDot status={m.burnout_status} size="sm" />
                  <span>
                    {t("owner_dash_utilization")}: {m.utilization_pct}%
                  </span>
                </span>
                {m.feedback_sentiment !== "insufficient_data" && (
                  <span className="font-mono">
                    {m.feedback_sentiment === "positive"
                      ? "😌"
                      : m.feedback_sentiment === "negative"
                        ? "😤"
                        : "·"}
                  </span>
                )}
              </div>
              <AILeverageBar
                minutesByType={{
                  spec: m.ai_leverage_ratio.spec_pct,
                  build: m.ai_leverage_ratio.build_pct,
                  debug: m.ai_leverage_ratio.debug_pct,
                  polish: m.ai_leverage_ratio.polish_pct,
                }}
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="md" className="space-y-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("owner_dash_capacity")}
        </h2>
        <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("owner_dash_capacity_help")}
        </p>
        <CapacityTrend trend={data.capacity_trend} />
      </Card>
    </main>
  );
}

function CapacityTrend({
  trend,
}: {
  trend: TeamAnalytics["capacity_trend"];
}) {
  const maxMin = Math.max(
    48 * 60,
    ...trend.flatMap((w) => w.members.map((m) => m.total_minutes))
  );
  return (
    <div className="space-y-2">
      {trend.length === 0 ? (
        <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">—</p>
      ) : (
        trend[0].members.map((m) => (
          <div key={m.user_id} className="space-y-0.5">
            <div className="flex justify-between text-[11px] text-ikigai-dark/60 dark:text-ikigai-cream/60">
              <span>{m.name}</span>
            </div>
            <div className="flex items-end gap-0.5 h-12">
              {trend.map((w) => {
                const row = w.members.find((x) => x.user_id === m.user_id);
                const mins = row?.total_minutes ?? 0;
                const pct = Math.max(2, Math.round((mins / maxMin) * 100));
                return (
                  <div
                    key={w.week_start}
                    className="flex-1 flex flex-col justify-end"
                    title={`${w.week_start}: ${Math.round(mins / 6) / 10}h`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-sm",
                        row?.is_baseline
                          ? "bg-ikigai-purple/30"
                          : "bg-ikigai-purple"
                      )}
                      style={{
                        height: `${pct}%`,
                        backgroundImage: row?.is_baseline
                          ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(255,255,255,0.35) 4px 6px)"
                          : undefined,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
