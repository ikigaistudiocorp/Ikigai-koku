"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProjectModal } from "./ProjectModal";
import type { Project } from "@/types";

type ProjectListItem = Project & {
  my_minutes_all?: number;
  accumulated_minutes: number;
  last_activity_at: string | null;
};

type ProjectsSort = "name" | "accumulated" | "recent";
const PROJECTS_SORT_LS_KEY = "koku-projects-sort";

function useProjectsList() {
  return useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error("projects");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useTeam() {
  return useQuery<{ members: { id: string; name: string; email: string }[] }>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/team", { credentials: "include" });
      if (!res.ok) throw new Error("team");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUser();
  const { data } = useProjectsList();
  const { data: team } = useTeam();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const isOwner = me?.kokuUser?.role === "owner";
  const rawProjects = (data?.projects ?? []) as ProjectListItem[];

  const [sortKey, setSortKey] = useState<ProjectsSort>("name");
  useEffect(() => {
    const stored = localStorage.getItem(PROJECTS_SORT_LS_KEY);
    if (stored === "name" || stored === "accumulated" || stored === "recent") {
      setSortKey(stored);
    }
  }, []);
  const setSort = (v: ProjectsSort) => {
    setSortKey(v);
    localStorage.setItem(PROJECTS_SORT_LS_KEY, v);
  };
  const projects = useMemo(() => {
    const r = [...rawProjects];
    if (sortKey === "accumulated") {
      r.sort((a, b) => b.accumulated_minutes - a.accumulated_minutes);
    } else if (sortKey === "recent") {
      r.sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""));
    } else {
      r.sort((a, b) => a.name.localeCompare(b.name));
    }
    return r;
  }, [rawProjects, sortKey]);

  const createProject = async (payload: Partial<Project> & { member_ids?: string[] }) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`create ${res.status}`);
    await qc.invalidateQueries({ queryKey: ["projects"] });
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-5">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-heading">{t("nav_projects")}</h1>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSort(e.target.value as ProjectsSort)}
            aria-label={t("sort_label")}
            className="text-xs rounded-full px-2 py-1 border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          >
            <option value="name">{t("sort_name")}</option>
            <option value="accumulated">{t("sort_accumulated")}</option>
            <option value="recent">{t("sort_recent")}</option>
          </select>
          {isOwner && (
            <Button size="sm" onClick={() => setShowNew(true)}>
              + {t("projects_new")}
            </Button>
          )}
        </div>
      </header>

      {projects.length === 0 ? (
        <p className="text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60 py-10">
          {t("projects_empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block"
              >
                <Card padding="md" className="hover:border-ikigai-purple/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-medium truncate">{p.name}</h2>
                      {p.client_name && (
                        <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60 truncate">
                          {p.client_name}
                        </p>
                      )}
                      <p className="text-xs font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50 mt-1">
                        {Math.floor(p.accumulated_minutes / 60)}h{" "}
                        {p.accumulated_minutes % 60}m
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <ProjectModal
          open={showNew}
          onClose={() => setShowNew(false)}
          onSubmit={createProject}
          team={team?.members ?? []}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const color =
    status === "active"
      ? "bg-ikigai-emerald/15 text-ikigai-emerald"
      : status === "paused"
        ? "bg-ikigai-amber/15 text-ikigai-amber"
        : "bg-black/10 dark:bg-white/10 text-ikigai-dark/60 dark:text-ikigai-cream/60";
  const label = t(`projects_status_${status}`);
  return (
    <span className={`text-[11px] uppercase font-mono px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}
