"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CustomWorkType, Project } from "@/types";

type AllCustomTypes = {
  custom_work_types: CustomWorkType[];
};

async function fetchAllCustoms(): Promise<AllCustomTypes> {
  // Query without project_id to get global + archived types. Archived are
  // filtered out by default; we want both for the management page so we
  // go through /api/sessions filter. Simpler: hit the endpoint without
  // project_id, which returns globals only. For project-scoped list we
  // aggregate via /api/projects + per-project detail API.
  const res = await fetch("/api/work-types?all=true", { credentials: "include" });
  if (!res.ok) throw new Error("work-types");
  return res.json();
}

export default function WorkTypesSettingsPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [newGlobal, setNewGlobal] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectTarget, setNewProjectTarget] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const { data: customs } = useQuery({
    queryKey: ["work-types-all"],
    queryFn: fetchAllCustoms,
    staleTime: 30_000,
    enabled: !!me && me.kokuUser.role === "owner",
  });

  const { data: projects } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: async () => {
      const r = await fetch("/api/projects", { credentials: "include" });
      if (!r.ok) throw new Error("projects");
      return r.json();
    },
    enabled: !!me && me.kokuUser.role === "owner",
    staleTime: 60_000,
  });

  if (!meLoading && me && me.kokuUser.role !== "owner") {
    redirect("/clock");
  }

  const globals = useMemo(
    () => (customs?.custom_work_types ?? []).filter((c) => c.scope === "global"),
    [customs]
  );
  const projectScoped = useMemo(
    () => (customs?.custom_work_types ?? []).filter((c) => c.scope === "project"),
    [customs]
  );

  const create = async (name: string, scope: "global" | "project", projectId?: string) => {
    setErr(null);
    const res = await fetch("/api/work-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, scope, project_id: projectId }),
    });
    if (!res.ok) {
      setErr(`create ${res.status}`);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["work-types-all"] });
    await qc.invalidateQueries({ queryKey: ["work-types"] });
  };

  const archive = async (id: string) => {
    if (!window.confirm(t("settings_custom_types_archive_confirm"))) return;
    const res = await fetch(`/api/work-types/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setErr(`archive ${res.status}`);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["work-types-all"] });
    await qc.invalidateQueries({ queryKey: ["work-types"] });
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-6">
      <h1 className="text-2xl font-heading">
        {t("settings_custom_types_title")}
      </h1>

      {err && <p className="text-sm text-ikigai-rose">{err}</p>}

      <Card padding="md" className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_custom_types_global")}
        </h2>
        <ul className="space-y-1">
          {globals.map((c) => (
            <TypeRow
              key={c.id}
              c={c}
              onArchive={archive}
            />
          ))}
          {globals.length === 0 && (
            <li className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
              —
            </li>
          )}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newGlobal.trim()) return;
            create(newGlobal.trim(), "global").then(() => setNewGlobal(""));
          }}
          className="flex gap-2"
        >
          <input
            value={newGlobal}
            onChange={(e) => setNewGlobal(e.target.value.slice(0, 40))}
            placeholder={t("settings_custom_types_add_global")}
            className="flex-1 h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
          <Button type="submit" size="sm">
            +
          </Button>
        </form>
      </Card>

      <Card padding="md" className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_custom_types_project_scoped")}
        </h2>
        <ul className="space-y-1">
          {projectScoped.map((c) => {
            const project = projects?.projects.find((p) => p.id === c.project_id);
            return (
              <TypeRow
                key={c.id}
                c={c}
                subtitle={project?.name}
                onArchive={archive}
              />
            );
          })}
          {projectScoped.length === 0 && (
            <li className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
              —
            </li>
          )}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newProjectName.trim() || !newProjectTarget) return;
            create(newProjectName.trim(), "project", newProjectTarget).then(() => {
              setNewProjectName("");
              setNewProjectTarget("");
            });
          }}
          className="flex gap-2"
        >
          <select
            value={newProjectTarget}
            onChange={(e) => setNewProjectTarget(e.target.value)}
            className="h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          >
            <option value="">{t("nav_projects")}</option>
            {projects?.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value.slice(0, 40))}
            placeholder={t("settings_custom_types_add_project")}
            className="flex-1 h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
          <Button type="submit" size="sm">
            +
          </Button>
        </form>
      </Card>
    </main>
  );
}

function TypeRow({
  c,
  subtitle,
  onArchive,
}: {
  c: CustomWorkType;
  subtitle?: string;
  onArchive: (id: string) => void;
}) {
  const { t } = useTranslation();
  const archived = c.status === "archived";
  return (
    <li
      className={`flex items-center gap-3 py-2 ${
        archived ? "opacity-50" : ""
      }`}
    >
      <span
        aria-hidden
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: c.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="truncate">{c.name}</div>
        {subtitle && (
          <div className="text-xs text-ikigai-dark/50 dark:text-ikigai-cream/50 truncate">
            {subtitle}
          </div>
        )}
      </div>
      {archived ? (
        <span className="text-[10px] uppercase font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50">
          {t("settings_custom_types_archived")}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onArchive(c.id)}
          className="text-xs text-ikigai-rose underline"
        >
          {t("common_cancel")}
        </button>
      )}
    </li>
  );
}
