"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ProjectPicker } from "@/components/ui/ProjectPicker";
import { WorkTypePicker } from "@/components/ui/WorkTypePicker";
import { WorkTypeDot } from "@/components/ui/WorkTypeDot";
import { WORK_TYPE_META, type WorkType } from "@/types";
import { useProjects, useCustomWorkTypes } from "@/hooks/useProjects";

type PlannedRow = {
  id: string;
  project_id: string;
  project_name: string;
  work_type: string;
  custom_work_type_id: string | null;
  custom_work_type_name: string | null;
  custom_work_type_color: string | null;
  note: string | null;
  created_at: string;
};

type PickerValue =
  | { kind: "builtin"; workType: WorkType }
  | { kind: "custom"; customId: string };

export function PlannedSessions({
  onStartFromPlan,
  disabled,
}: {
  onStartFromPlan: (row: PlannedRow) => Promise<void> | void;
  disabled?: boolean;
}) {
  const { t, language } = useTranslation();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data } = useQuery<{ planned: PlannedRow[] }>({
    queryKey: ["planned-sessions"],
    queryFn: async () => {
      const r = await fetch("/api/planned-sessions", { credentials: "include" });
      if (!r.ok) throw new Error("planned");
      return r.json();
    },
    staleTime: 15_000,
  });

  const remove = async (id: string) => {
    await fetch(`/api/planned-sessions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    qc.invalidateQueries({ queryKey: ["planned-sessions"] });
  };

  const rows = data?.planned ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("planned_title")}
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-mono text-ikigai-purple"
        >
          + {t("planned_add")}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60 py-2">
          {t("planned_empty")}
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((p) => {
            const meta = WORK_TYPE_META[p.work_type as WorkType];
            const label =
              p.custom_work_type_name ??
              (language === "en" ? meta?.label_en : meta?.label_es);
            return (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg bg-white dark:bg-ikigai-card px-3 py-2 border border-black/[0.05] dark:border-white/[0.06]"
              >
                <WorkTypeDot
                  workType={p.work_type}
                  customColor={p.custom_work_type_color}
                />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="truncate">
                    {label} · {p.project_name}
                  </div>
                  {p.note && (
                    <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60 truncate">
                      {p.note}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onStartFromPlan(p)}
                  disabled={disabled}
                  className="text-xs font-mono text-ikigai-purple disabled:opacity-40"
                >
                  {t("planned_start_now")}
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={t("planned_delete")}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-ikigai-dark/60 dark:text-ikigai-cream/60"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <BottomSheet open onClose={() => setAdding(false)}>
          <AddPlannedSheet onClose={() => setAdding(false)} />
        </BottomSheet>
      )}
    </div>
  );
}

function AddPlannedSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: projectsData } = useProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerValue | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: customData } = useCustomWorkTypes(projectId);

  const save = async () => {
    if (!projectId || !picker) return;
    setBusy(true);
    try {
      const body =
        picker.kind === "builtin"
          ? { project_id: projectId, work_type: picker.workType, note: note || null }
          : {
              project_id: projectId,
              work_type: "other" as const,
              custom_work_type_id: picker.customId,
              note: note || null,
            };
      const res = await fetch("/api/planned-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      qc.invalidateQueries({ queryKey: ["planned-sessions"] });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-2">
      <h3 className="text-lg font-heading">{t("planned_new_title")}</h3>
      <ProjectPicker
        projects={projectsData?.projects ?? []}
        value={projectId}
        onChange={setProjectId}
      />
      {projectId && (
        <WorkTypePicker
          value={picker}
          onChange={setPicker}
          projectId={projectId}
          customWorkTypes={customData?.custom_work_types ?? []}
        />
      )}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("clock_note_placeholder")}
        className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
      />
      <div className="flex gap-2">
        <Button variant="ghost" fullWidth onClick={onClose} disabled={busy}>
          {t("planned_delete")}
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={save}
          loading={busy}
          disabled={!projectId || !picker}
        >
          {t("planned_add")}
        </Button>
      </div>
    </div>
  );
}
