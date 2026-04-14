"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { AILeverageBar } from "@/components/AILeverageBar";
import type { Project } from "@/types";

type MyAnalytics = {
  ai_leverage_ratio: {
    spec_pct: number;
    build_pct: number;
    debug_pct: number;
    polish_pct: number;
  };
  weekly_hours: {
    week_start: string;
    by_work_type: Record<string, number>;
    is_baseline: boolean;
  }[];
};

type ProjectAnalytics = {
  total_minutes: number;
  ai_leverage_ratio: {
    spec_pct: number;
    build_pct: number;
    debug_pct: number;
    polish_pct: number;
  };
  feedback_summary: {
    difficult_count: number;
    flowed_count: number;
    blocked_count: number;
  };
};

export default function AILeverageReportPage() {
  const { t } = useTranslation();

  const { data: my } = useQuery<MyAnalytics>({
    queryKey: ["analytics", "my"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/my", { credentials: "include" });
      if (!r.ok) throw new Error("my");
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

      {projectAnalytics && projectAnalytics.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("nav_projects")}
          </h2>
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
    </main>
  );
}
