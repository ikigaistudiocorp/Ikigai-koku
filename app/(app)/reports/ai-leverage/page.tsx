"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card } from "@/components/ui/Card";
import { AILeverageBar } from "@/components/AILeverageBar";
import { WorkTypeLegend } from "@/components/ui/WorkTypeLegend";
import type { Project } from "@/types";

type MyAnalytics = {
  ai_leverage_ratio: {
    spec_pct: number;
    build_pct: number;
    debug_pct: number;
    polish_pct: number;
  };
};

type ProjectAnalytics = {
  total_minutes: number;
  ai_leverage_ratio: {
    spec_pct: number;
    build_pct: number;
    debug_pct: number;
    polish_pct: number;
  };
};

type FeedbackCorrelation = {
  difficult: { session_count: number; leverage: { debug_pct: number } };
  flowed: { session_count: number; leverage: { debug_pct: number } };
  blocked: { session_count: number; leverage: { debug_pct: number } };
};

type TeamAnalytics = {
  members: Array<{
    user_id: string;
    name: string;
    ai_leverage_ratio: {
      spec_pct: number;
      build_pct: number;
      debug_pct: number;
      polish_pct: number;
    };
    this_week_minutes: number;
  }>;
};

export default function AILeverageReportPage() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUser();
  const isOwner = me?.kokuUser?.role === "owner";

  const { data: my } = useQuery<MyAnalytics>({
    queryKey: ["analytics", "my"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/my", { credentials: "include" });
      if (!r.ok) throw new Error("my");
      return r.json();
    },
    staleTime: 30_000,
  });

  const { data: correlation } = useQuery<FeedbackCorrelation>({
    queryKey: ["feedback-correlation"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/feedback-correlation", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("correlation");
      return r.json();
    },
    staleTime: 30_000,
  });

  const { data: team } = useQuery<TeamAnalytics>({
    queryKey: ["analytics", "team"],
    enabled: isOwner,
    queryFn: async () => {
      const r = await fetch("/api/analytics/team", { credentials: "include" });
      if (!r.ok) throw new Error("team");
      return r.json();
    },
    staleTime: 30_000,
  });

  const { data: projects } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: async () => {
      const r = await fetch("/api/projects", { credentials: "include" });
      if (!r.ok) throw new Error("projects");
      return r.json();
    },
  });

  const projectIds = projects?.projects.map((p) => p.id) ?? [];
  const { data: projectAnalytics } = useQuery<
    { project: Project; analytics: ProjectAnalytics }[]
  >({
    queryKey: ["project-analytics", projectIds],
    enabled: !!projects && projectIds.length > 0,
    queryFn: async () => {
      const all = await Promise.all(
        (projects?.projects ?? []).map(async (p) => {
          const r = await fetch(`/api/analytics/project/${p.id}`, {
            credentials: "include",
          });
          if (!r.ok) return null;
          return { project: p, analytics: (await r.json()) as ProjectAnalytics };
        })
      );
      return all.filter(
        (x): x is { project: Project; analytics: ProjectAnalytics } => !!x
      );
    },
  });

  const hasCorrelation =
    !!correlation &&
    correlation.difficult.session_count + correlation.flowed.session_count > 0;

  return (
    <main className="flex-1 px-5 py-6 space-y-4">
      <h1 className="text-2xl font-heading">{t("reports_ai_leverage")}</h1>

      {my && (
        <Card padding="md" className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("dash_ai_leverage_label")}
          </h2>
          <AILeverageBar
            minutesByType={{
              spec: my.ai_leverage_ratio.spec_pct,
              build: my.ai_leverage_ratio.build_pct,
              debug: my.ai_leverage_ratio.debug_pct,
              polish: my.ai_leverage_ratio.polish_pct,
            }}
          />
          <div className="grid grid-cols-4 text-center text-xs font-mono">
            <div>SPEC {my.ai_leverage_ratio.spec_pct}%</div>
            <div>BUILD {my.ai_leverage_ratio.build_pct}%</div>
            <div>DEBUG {my.ai_leverage_ratio.debug_pct}%</div>
            <div>POLISH {my.ai_leverage_ratio.polish_pct}%</div>
          </div>
        </Card>
      )}

      <Card padding="md" className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("ai_feedback_correlation_title")}
        </h2>
        {hasCorrelation ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                😤 {t("ai_feedback_difficult")}{" "}
                <span className="font-mono">
                  ({correlation.difficult.session_count})
                </span>
              </div>
              <div className="text-2xl font-mono text-ikigai-rose tabular-nums">
                {correlation.difficult.leverage.debug_pct}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-ikigai-dark/50 dark:text-ikigai-cream/50">
                {t("ai_feedback_debug_share")}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                😌 {t("ai_feedback_flowed")}{" "}
                <span className="font-mono">
                  ({correlation.flowed.session_count})
                </span>
              </div>
              <div className="text-2xl font-mono text-ikigai-emerald tabular-nums">
                {correlation.flowed.leverage.debug_pct}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-ikigai-dark/50 dark:text-ikigai-cream/50">
                {t("ai_feedback_debug_share")}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("ai_feedback_correlation_empty")}
          </p>
        )}
      </Card>

      {projectAnalytics && projectAnalytics.length > 0 && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
              {t("nav_projects")}
            </h2>
            <WorkTypeLegend />
          </div>
          <ul className="space-y-3">
            {projectAnalytics.map(({ project, analytics }) => (
              <li key={project.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{project.name}</span>
                  <span className="font-mono tabular-nums">
                    {(analytics.total_minutes / 60).toFixed(1)}h
                  </span>
                </div>
                <AILeverageBar
                  minutesByType={{
                    spec: analytics.ai_leverage_ratio.spec_pct,
                    build: analytics.ai_leverage_ratio.build_pct,
                    debug: analytics.ai_leverage_ratio.debug_pct,
                    polish: analytics.ai_leverage_ratio.polish_pct,
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isOwner && team && team.members.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("ai_team_comparison")}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-ikigai-dark/60 dark:text-ikigai-cream/60">
                <th className="py-1 pr-2 font-normal">{t("reports_col_name")}</th>
                <th className="py-1 pr-2 font-normal text-right">SPEC</th>
                <th className="py-1 pr-2 font-normal text-right">BUILD</th>
                <th className="py-1 pr-2 font-normal text-right">DEBUG</th>
                <th className="py-1 pr-2 font-normal text-right">POLISH</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr
                  key={m.user_id}
                  className="border-t border-black/[0.04] dark:border-white/[0.06]"
                >
                  <td className="py-1 pr-2 truncate">{m.name}</td>
                  <td className="py-1 pr-2 text-right font-mono">
                    {m.ai_leverage_ratio.spec_pct}%
                  </td>
                  <td className="py-1 pr-2 text-right font-mono">
                    {m.ai_leverage_ratio.build_pct}%
                  </td>
                  <td className="py-1 pr-2 text-right font-mono">
                    {m.ai_leverage_ratio.debug_pct}%
                  </td>
                  <td className="py-1 pr-2 text-right font-mono">
                    {m.ai_leverage_ratio.polish_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
