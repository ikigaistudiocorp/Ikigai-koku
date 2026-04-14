"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useTodaySummary } from "@/hooks/useTodaySummary";
import { useProjects, useCustomWorkTypes } from "@/hooks/useProjects";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useClockStore } from "@/store/clockStore";
import { useTranslation } from "@/lib/i18n";
import { WORK_TYPE_META, type WorkType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Timer } from "@/components/ui/Timer";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ProjectPicker } from "@/components/ui/ProjectPicker";
import { WorkTypePicker } from "@/components/ui/WorkTypePicker";
import { SessionFeedbackPicker } from "@/components/ui/SessionFeedbackPicker";
import { MAX_NOTE_LENGTH } from "@/lib/sessions";

type PickerValue =
  | { kind: "builtin"; workType: WorkType }
  | { kind: "custom"; customId: string };

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "clock_greeting_morning";
  if (h < 19) return "clock_greeting_afternoon";
  return "clock_greeting_evening";
}

function formatHM(minutes: number): { h: number; m: number } {
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

export function ClockScreen() {
  const qc = useQueryClient();
  const { t, language } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { data: active } = useActiveSession();
  const { data: today } = useTodaySummary();
  const { data: projectsData } = useProjects();

  const storedProject = useClockStore((s) => s.selectedProjectId);
  const setStoredProject = useClockStore((s) => s.setSelectedProjectId);

  const [pickerValue, setPickerValue] = useState<PickerValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"project" | "switch" | null>(null);
  const [note, setNote] = useState("");
  const [pendingStopId, setPendingStopId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedProjectId = storedProject;
  const selectedProject =
    projectsData?.projects.find((p) => p.id === selectedProjectId) ?? null;
  const { data: customData } = useCustomWorkTypes(selectedProjectId);

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sessions", "active"] }),
      qc.invalidateQueries({ queryKey: ["sessions", "today"] }),
    ]);
  };

  const onStart = async () => {
    if (!selectedProjectId || !pickerValue) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        pickerValue.kind === "builtin"
          ? { project_id: selectedProjectId, work_type: pickerValue.workType }
          : {
              project_id: selectedProjectId,
              work_type: "other" as const,
              custom_work_type_id: pickerValue.customId,
            };
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "start_failed");
    } finally {
      setBusy(false);
    }
  };

  const onSwitch = async (v: PickerValue) => {
    if (!active) return;
    setSheet(null);
    setBusy(true);
    setError(null);
    try {
      const body =
        v.kind === "builtin"
          ? { session_id: active.id, new_work_type: v.workType }
          : {
              session_id: active.id,
              new_work_type: "other" as const,
              new_custom_work_type_id: v.customId,
            };
      const res = await fetch("/api/sessions/switch-type", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "switch_failed");
    } finally {
      setBusy(false);
    }
  };

  const onStopPressed = () => {
    if (!active) return;
    setPendingStopId(active.id);
  };

  const finishStop = async (feedback: "difficult" | "flowed" | "blocked" | null) => {
    if (!pendingStopId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          session_id: pendingStopId,
          note: note || null,
          feedback,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        discarded: boolean;
        duration_minutes?: number;
      };
      setPendingStopId(null);
      setNote("");
      await refreshAll();
      if (data.discarded) {
        setToast(t("clock_session_discarded"));
      } else if (typeof data.duration_minutes === "number") {
        const { h, m } = formatHM(data.duration_minutes);
        setToast(
          t("clock_session_saved", {
            duration: `${h}h ${m}m`,
            type: active ? labelFor(active.work_type, language) : "",
            project: active?.project.name ?? "",
          })
        );
      }
      window.setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "stop_failed");
    } finally {
      setBusy(false);
    }
  };

  // ── STATE B: clocked in ──
  if (active) {
    return (
      <main className="flex-1 flex flex-col gap-6 px-5 py-6">
        {!isOnline && <OfflineBanner />}

        <Card padding="lg" className="text-center space-y-4">
          <div>
            <p className="text-xs uppercase font-mono tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
              {t("clock_active_on")}
            </p>
            <h1 className="text-2xl font-heading">{active.project.name}</h1>
            {active.project.client_name && (
              <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
                {active.project.client_name}
              </p>
            )}
          </div>
          <Timer
            startedAt={active.started_at}
            className="text-6xl text-ikigai-purple block"
          />
          <Badge
            workType={active.work_type as WorkType}
            label={labelFor(active.work_type, language)}
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSheet("switch")}
            >
              {t("clock_switch_type")}
            </Button>
          </div>
        </Card>

        <label className="block">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            placeholder={t("clock_note_placeholder")}
            rows={3}
            className="w-full rounded-lg p-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/15 text-base resize-none"
          />
          <p className="text-right text-xs text-ikigai-dark/50 dark:text-ikigai-cream/50 font-mono">
            {note.length}/{MAX_NOTE_LENGTH}
          </p>
        </label>

        {error && (
          <p className="text-sm text-ikigai-rose" role="alert">
            {error}
          </p>
        )}

        <Button
          variant="danger"
          size="lg"
          fullWidth
          loading={busy}
          disabled={!isOnline && !active}
          onClick={onStopPressed}
        >
          {t("clock_button_stop")}
        </Button>

        <TodayList today={today} />

        <BottomSheet
          open={sheet === "switch"}
          onClose={() => setSheet(null)}
          title={t("clock_switch_type")}
        >
          <WorkTypePicker
            projectId={active.project_id}
            customWorkTypes={customData?.custom_work_types ?? []}
            value={{
              kind: "builtin",
              workType: active.work_type as WorkType,
            }}
            onChange={onSwitch}
          />
        </BottomSheet>

        {pendingStopId && (
          <BottomSheet open onClose={() => finishStop(null)}>
            <SessionFeedbackPicker onSelect={finishStop} />
          </BottomSheet>
        )}

        {toast && <Toast message={toast} />}
      </main>
    );
  }

  // ── STATE A: not clocked in ──
  const todayTotal = today ? formatHM(today.total_minutes_today) : { h: 0, m: 0 };
  const canStart = !!selectedProjectId && !!pickerValue && isOnline;

  return (
    <main className="flex-1 flex flex-col gap-6 px-5 py-6">
      {!isOnline && <OfflineBanner />}

      <header className="space-y-1">
        <h1 className="text-3xl font-heading text-ikigai-purple">
          {t(greetingKey())}
        </h1>
        <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60 font-mono">
          {today && today.session_count > 0
            ? t("clock_today_summary", {
                hours: todayTotal.h,
                minutes: todayTotal.m,
                count: today.session_count,
              })
            : t("clock_no_sessions")}
        </p>
      </header>

      <Card padding="md" className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("clock_select_project")}
        </div>
        {selectedProject ? (
          <button
            type="button"
            onClick={() => setSheet("project")}
            className="w-full text-left rounded-lg p-3 border border-ikigai-purple bg-ikigai-purple/10"
          >
            <div className="font-medium">{selectedProject.name}</div>
            {selectedProject.client_name && (
              <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                {selectedProject.client_name}
              </div>
            )}
          </button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => setSheet("project")}
          >
            {t("clock_select_project")}
          </Button>
        )}
      </Card>

      <Card padding="md">
        <div className="text-xs uppercase tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60 mb-3">
          {t("clock_select_worktype")}
        </div>
        <WorkTypePicker
          projectId={selectedProjectId}
          customWorkTypes={customData?.custom_work_types ?? []}
          value={pickerValue}
          onChange={setPickerValue}
        />
      </Card>

      {error && (
        <p className="text-sm text-ikigai-rose" role="alert">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={busy}
        disabled={!canStart}
        onClick={onStart}
      >
        {t("clock_button_start")}
      </Button>

      <TodayList today={today} />

      <BottomSheet
        open={sheet === "project"}
        onClose={() => setSheet(null)}
        title={t("clock_select_project")}
      >
        <ProjectPicker
          value={selectedProjectId}
          projects={projectsData?.projects ?? []}
          recentIds={projectsData?.recent_project_ids ?? []}
          onChange={(id) => {
            setStoredProject(id);
            setSheet(null);
          }}
        />
      </BottomSheet>

      {toast && <Toast message={toast} />}
    </main>
  );
}

function labelFor(workType: string, language: "es" | "en"): string {
  const meta = WORK_TYPE_META[workType as WorkType];
  if (!meta) return workType;
  return language === "en" ? meta.label_en : meta.label_es;
}

function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg bg-ikigai-amber/20 border border-ikigai-amber/40 text-ikigai-amber px-3 py-2 text-sm">
      <strong className="font-medium">{t("offline_banner")}</strong>
      <span className="ml-2 text-ikigai-amber/80">{t("offline_detail")}</span>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-ikigai-dark text-white dark:bg-ikigai-cream dark:text-ikigai-dark text-sm rounded-full px-4 py-2 shadow-lg">
      {message}
    </div>
  );
}

function TodayList({ today }: { today: ReturnType<typeof useTodaySummary>["data"] }) {
  const { t, language } = useTranslation();
  if (!today || today.sessions.length === 0) {
    return (
      <p className="text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {t("clock_no_sessions")}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {today.sessions.map((s) => {
        const minutes = s.duration_minutes ?? 0;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const meta = WORK_TYPE_META[s.work_type as WorkType];
        return (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-lg bg-white dark:bg-ikigai-card px-3 py-2 border border-black/[0.05] dark:border-white/[0.06]"
          >
            <span className="text-lg" aria-hidden>{meta?.emoji ?? "•"}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">
                {s.custom_work_type_name ??
                  (language === "en" ? meta?.label_en : meta?.label_es) ??
                  s.work_type}{" "}
                <span className="text-ikigai-dark/50 dark:text-ikigai-cream/50">·</span>{" "}
                <span className="text-ikigai-dark/70 dark:text-ikigai-cream/70">
                  {s.project_name}
                </span>
              </div>
              {s.note && (
                <div className="text-xs text-ikigai-dark/50 dark:text-ikigai-cream/50 truncate">
                  {s.note}
                </div>
              )}
            </div>
            <div className="font-mono text-sm tabular-nums">
              {h}h {m}m
            </div>
          </li>
        );
      })}
    </ul>
  );
}
