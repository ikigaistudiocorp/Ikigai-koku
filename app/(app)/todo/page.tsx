"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useClockStore } from "@/store/clockStore";
import { PlannedSessions } from "@/components/PlannedSessions";
import { toast as pushToast } from "@/store/toastStore";

export default function TodoPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: active } = useActiveSession();
  const setStoredProject = useClockStore((s) => s.setSelectedProjectId);
  const setStartedFromPlanId = useClockStore((s) => s.setStartedFromPlanId);

  const onStartFromPlan = async (row: {
    id: string;
    project_id: string;
    work_type: string;
    custom_work_type_id: string | null;
  }) => {
    if (active) {
      pushToast(t("planned_already_active"), "warning");
      return;
    }
    const body =
      row.custom_work_type_id
        ? {
            project_id: row.project_id,
            work_type: "other" as const,
            custom_work_type_id: row.custom_work_type_id,
          }
        : { project_id: row.project_id, work_type: row.work_type };
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      pushToast("start_failed", "warning");
      return;
    }
    setStartedFromPlanId(row.id);
    setStoredProject(row.project_id);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sessions", "active"] }),
      qc.invalidateQueries({ queryKey: ["sessions", "today"] }),
      qc.invalidateQueries({ queryKey: ["planned-sessions"] }),
    ]);
    router.push("/clock");
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-4">
      <h1 className="text-2xl font-heading">{t("nav_todo")}</h1>
      <PlannedSessions onStartFromPlan={onStartFromPlan} disabled={!!active} />
    </main>
  );
}
