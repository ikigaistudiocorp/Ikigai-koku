"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useProjects, useCustomWorkTypes } from "@/hooks/useProjects";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectPicker } from "@/components/ui/ProjectPicker";
import { WorkTypePicker } from "@/components/ui/WorkTypePicker";
import { SessionFeedbackPicker } from "@/components/ui/SessionFeedbackPicker";
import type { WorkType } from "@/types";

type PickerValue =
  | { kind: "builtin"; workType: WorkType }
  | { kind: "custom"; customId: string };

function toLocalInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function ManualSessionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { data: projectsData } = useProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerValue | null>(null);
  const { data: customData } = useCustomWorkTypes(projectId);
  const nowInput = useMemo(() => toLocalInput(new Date()), []);
  const [start, setStart] = useState(nowInput);
  const [end, setEnd] = useState(nowInput);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<
    "difficult" | "flowed" | "blocked" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();
  const invalid =
    !projectId ||
    !picker ||
    !Number.isFinite(startDate.getTime()) ||
    !Number.isFinite(endDate.getTime()) ||
    endDate <= startDate ||
    endDate > new Date(now.getTime() + 60_000);

  const save = async () => {
    if (invalid || !projectId || !picker) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        picker.kind === "builtin"
          ? {
              project_id: projectId,
              work_type: picker.workType,
              started_at: startDate.toISOString(),
              ended_at: endDate.toISOString(),
              note: note || null,
              feedback,
            }
          : {
              project_id: projectId,
              work_type: "other" as const,
              custom_work_type_id: picker.customId,
              started_at: startDate.toISOString(),
              ended_at: endDate.toISOString(),
              note: note || null,
              feedback,
            };
      const res = await fetch("/api/sessions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-end sm:items-center justify-center px-4 py-6">
        <Card padding="lg" className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-heading">{t("manual_session_title")}</h2>

        <ProjectPicker
          projects={projectsData?.projects ?? []}
          value={projectId}
          onChange={setProjectId}
        />

        {projectId && (
          <WorkTypePicker
            projectId={projectId}
            customWorkTypes={customData?.custom_work_types ?? []}
            value={picker}
            onChange={setPicker}
          />
        )}

        <label className="block text-sm space-y-1">
          <span className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("session_edit_start")}
          </span>
          <input
            type="datetime-local"
            value={start}
            max={nowInput}
            onChange={(e) => setStart(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </label>
        <label className="block text-sm space-y-1">
          <span className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("session_edit_end")}
          </span>
          <input
            type="datetime-local"
            value={end}
            min={start}
            max={nowInput}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </label>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("clock_note_placeholder")}
          className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
        />

        <SessionFeedbackPicker onSelect={setFeedback} selected={feedback} />

        {error && <p className="text-xs text-red-600">{error}</p>}
        {invalid && !error && (
          <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("manual_session_invalid")}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose} disabled={busy}>
            {t("session_edit_cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={save}
            loading={busy}
            disabled={invalid}
          >
            {t("manual_session_save")}
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
}
