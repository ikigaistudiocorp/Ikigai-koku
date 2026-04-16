"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProjectModal } from "./ProjectModal";
import { useCustomOrder } from "@/hooks/useCustomOrder";
import type { Project } from "@/types";

type ProjectListItem = Project & {
  my_minutes_all?: number;
  accumulated_minutes: number;
  last_activity_at: string | null;
};

type ProjectsSort = "name" | "accumulated" | "recent" | "custom";
const PROJECTS_SORT_LS_KEY = "koku-projects-sort";
const PROJECTS_ORDER_LS_KEY = "koku-projects-order";

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
    if (
      stored === "name" ||
      stored === "accumulated" ||
      stored === "recent" ||
      stored === "custom"
    ) {
      setSortKey(stored);
    }
  }, []);
  const setSort = (v: ProjectsSort) => {
    setSortKey(v);
    localStorage.setItem(PROJECTS_SORT_LS_KEY, v);
  };
  const { apply: applyCustomOrder, setOrder } = useCustomOrder(
    PROJECTS_ORDER_LS_KEY
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );
  const projects = useMemo(() => {
    const r = [...rawProjects];
    if (sortKey === "accumulated") {
      r.sort((a, b) => b.accumulated_minutes - a.accumulated_minutes);
    } else if (sortKey === "recent") {
      r.sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""));
    } else if (sortKey === "custom") {
      return applyCustomOrder(r);
    } else {
      r.sort((a, b) => a.name.localeCompare(b.name));
    }
    return r;
  }, [rawProjects, sortKey, applyCustomOrder]);

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = projects.map((p) => p.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    setOrder(arrayMove(ids, from, to));
  };

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
            <option value="custom">{t("sort_custom")}</option>
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
      ) : sortKey === "custom" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={projects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {projects.map((p) => (
                <ProjectRowItem key={p.id} project={p} sortable />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <ProjectRowItem key={p.id} project={p} sortable={false} />
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

function ProjectRowItem({
  project,
  sortable,
}: {
  project: ProjectListItem;
  sortable: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id, disabled: !sortable });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
    >
      <Card padding="md" className="hover:border-ikigai-purple/60 transition-colors">
        <div className="flex items-start gap-3">
          {sortable && (
            <button
              type="button"
              aria-label={t("drag_handle_label")}
              {...attributes}
              {...listeners}
              className="touch-none shrink-0 w-5 h-6 inline-flex items-center justify-center text-ikigai-dark/40 dark:text-ikigai-cream/40 cursor-grab active:cursor-grabbing"
            >
              ⋮⋮
            </button>
          )}
          <Link href={`/projects/${project.id}`} className="block flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium truncate">{project.name}</h2>
                {project.client_name && (
                  <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60 truncate">
                    {project.client_name}
                  </p>
                )}
                <p className="text-xs font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50 mt-1">
                  {Math.floor(project.accumulated_minutes / 60)}h{" "}
                  {project.accumulated_minutes % 60}m
                </p>
              </div>
              <StatusBadge status={project.status} />
            </div>
          </Link>
        </div>
      </Card>
    </li>
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
