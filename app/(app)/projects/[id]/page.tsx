"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AILeverageBar, aiLeverageRatio } from "@/components/AILeverageBar";
import { ProjectModal, type ProjectFormInitial } from "../ProjectModal";
import { WORK_TYPE_META, type WorkType } from "@/types";

type Detail = {
  project: {
    id: string;
    name: string;
    client_name: string | null;
    status: "active" | "paused" | "archived";
    billable: boolean;
    hourly_rate: string | null;
  };
  members: { user_id: string; name: string; email: string; role: string }[];
  my: {
    minutes_all_time: number;
    minutes_month: number;
    minutes_week: number;
    by_work_type_all: Record<string, number>;
  };
  recent_sessions: {
    id: string;
    work_type: string;
    started_at: string;
    duration_minutes: number | null;
    note: string | null;
    feedback: string | null;
    custom_work_type_name: string | null;
  }[];
  custom_work_types: {
    id: string;
    name: string;
    status: "active" | "archived";
    color: string;
  }[];
  team: {
    user_id: string;
    name: string;
    minutes: number;
    by_work_type: Record<string, number>;
  }[];
};

function formatHM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useTranslation();
  const { data: me } = useCurrentUser();
  const isOwner = me?.kokuUser?.role === "owner";
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: team } = useQuery<{ members: { id: string; name: string; email: string }[] }>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/team", { credentials: "include" });
      if (!res.ok) throw new Error("team");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const { data, isLoading } = useQuery<Detail>({
    queryKey: ["project-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("detail");
      return res.json();
    },
    staleTime: 30_000,
  });

  const savePatch = async (payload: ProjectFormInitial) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...payload,
        hourly_rate:
          payload.hourly_rate != null && payload.hourly_rate !== ""
            ? Number(payload.hourly_rate)
            : null,
      }),
    });
    if (!res.ok) throw new Error(`save ${res.status}`);
    await qc.invalidateQueries({ queryKey: ["project-detail", id] });
  };

  if (isLoading || !data) {
    return (
      <main className="flex-1 px-5 py-10 text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {t("common_loading")}
      </main>
    );
  }

  const ratio = aiLeverageRatio(data.my.by_work_type_all);

  return (
    <main className="flex-1 px-5 py-6 space-y-5">
      <header className="space-y-1">
        <Link href="/projects" className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
          ← {t("nav_projects")}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading">{data.project.name}</h1>
            {data.project.client_name && (
              <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
                {data.project.client_name}
              </p>
            )}
          </div>
          {isOwner && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {t("projects_detail_edit")}
            </Button>
          )}
        </div>
      </header>

      <Card padding="md" className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("projects_detail_my_time")}
        </h2>
        <div className="grid grid-cols-3 text-center">
          <StatCell label={t("projects_detail_this_week")} min={data.my.minutes_week} />
          <StatCell label={t("projects_detail_this_month")} min={data.my.minutes_month} />
          <StatCell label={t("projects_detail_all_time")} min={data.my.minutes_all_time} />
        </div>
        <div className="space-y-2">
          <AILeverageBar minutesByType={data.my.by_work_type_all} />
          <div className="grid grid-cols-4 text-center text-[11px] font-mono">
            {(["spec", "build", "debug", "polish"] as WorkType[]).map((w) => (
              <div key={w}>
                <div>{WORK_TYPE_META[w].emoji}</div>
                <div>{ratio[w]}%</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {data.recent_sessions.length > 0 ? (
        <Card padding="md">
          <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60 mb-2">
            {t("projects_detail_recent")}
          </h2>
          <ul className="space-y-1 text-sm">
            {data.recent_sessions.map((s) => {
              const meta = WORK_TYPE_META[s.work_type as WorkType];
              return (
                <li key={s.id} className="flex items-center gap-2 py-1">
                  <span aria-hidden>{meta?.emoji ?? "•"}</span>
                  <span className="flex-1 truncate">
                    {s.custom_work_type_name ??
                      (language === "en" ? meta?.label_en : meta?.label_es)}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ikigai-dark/70 dark:text-ikigai-cream/70">
                    {formatHM(s.duration_minutes ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <p className="text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("projects_no_sessions")}
        </p>
      )}

      {isOwner && data.team.length > 0 && (
        <Card padding="md">
          <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60 mb-3">
            {t("projects_detail_team")}
          </h2>
          <ul className="space-y-2">
            {data.team.map((m) => (
              <li key={m.user_id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{m.name}</span>
                  <span className="font-mono tabular-nums">
                    {formatHM(m.minutes)}
                  </span>
                </div>
                <AILeverageBar minutesByType={m.by_work_type} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isOwner && (
        <ProjectModal
          open={editing}
          onClose={() => setEditing(false)}
          initial={{
            id: data.project.id,
            name: data.project.name,
            client_name: data.project.client_name,
            billable: data.project.billable,
            hourly_rate: data.project.hourly_rate,
            member_ids: data.members.map((m) => m.user_id),
            status: data.project.status,
          }}
          team={team?.members ?? []}
          onSubmit={savePatch}
        />
      )}
    </main>
  );
}

function StatCell({ label, min }: { label: string; min: number }) {
  return (
    <div>
      <div className="text-lg font-mono tabular-nums">{formatHM(min)}</div>
      <div className="text-[10px] uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {label}
      </div>
    </div>
  );
}
