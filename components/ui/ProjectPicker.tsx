"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Props = {
  value: string | null;
  onChange: (projectId: string) => void;
  projects: Project[];
  recentIds?: string[];
};

export function ProjectPicker({
  value,
  onChange,
  projects,
  recentIds = [],
}: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  const sorted = useMemo(() => {
    const active = projects.filter((p) => p.status === "active");
    const recentSet = new Set(recentIds);
    const recents = recentIds
      .map((id) => active.find((p) => p.id === id))
      .filter((p): p is Project => !!p);
    const others = active.filter((p) => !recentSet.has(p.id));
    const all = [...recents, ...others];
    if (!q) return all;
    const needle = q.toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.client_name ?? "").toLowerCase().includes(needle)
    );
  }, [projects, recentIds, q]);

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("clock_select_project")}
        className="w-full h-12 px-4 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 text-base"
      />
      <ul className="space-y-1 max-h-72 overflow-auto">
        {sorted.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onChange(p.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                value === p.id
                  ? "border-ikigai-purple bg-ikigai-purple/10"
                  : "border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
              )}
            >
              <div className="font-medium">{p.name}</div>
              {p.client_name && (
                <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                  {p.client_name}
                </div>
              )}
            </button>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
            —
          </li>
        )}
      </ul>
    </div>
  );
}
