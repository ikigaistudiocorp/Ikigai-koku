"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";
import { WORK_TYPE_META, type WorkType } from "@/types";
import { WorkTypeDot } from "@/components/ui/WorkTypeDot";
import { WorkTypeLegend } from "@/components/ui/WorkTypeLegend";
import {
  SessionEditModal,
  type EditHistoryEntry,
} from "@/components/SessionEditModal";

type SessionRow = {
  id: string;
  user_id: string;
  user_name: string;
  project_id: string;
  project_name: string;
  work_type: string;
  custom_work_type_name: string | null;
  custom_work_type_color: string | null;
  duration_minutes: number | null;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  feedback: string | null;
  is_baseline: boolean;
  edited_at: string | null;
  edit_history: EditHistoryEntry[] | null;
};

type ListResponse = {
  sessions: SessionRow[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 25;

const SUSPICIOUS_MINUTES = 6 * 60;

function isSuspicious(s: SessionRow): boolean {
  if ((s.duration_minutes ?? 0) >= SUSPICIOUS_MINUTES) return true;
  if (s.ended_at) {
    const d1 = s.started_at.slice(0, 10);
    const d2 = s.ended_at.slice(0, 10);
    if (d1 !== d2) return true;
  }
  return false;
}

export default function SessionsHistoryPage() {
  const { t, language } = useTranslation();
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery<ListResponse>({
    queryKey: ["sessions-history", offset],
    queryFn: async () => {
      const r = await fetch(
        `/api/sessions?limit=${PAGE_SIZE}&offset=${offset}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("history");
      return r.json();
    },
    staleTime: 30_000,
  });

  if (!data) {
    return (
      <main className="flex-1 px-5 py-10 text-center text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {t("common_loading")}
      </main>
    );
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <main className="flex-1 px-5 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading">{t("reports_sessions")}</h1>
        <WorkTypeLegend />
      </div>

      <ul className="space-y-1">
        {data.sessions.map((s) => {
          const meta = WORK_TYPE_META[s.work_type as WorkType];
          const h = Math.floor((s.duration_minutes ?? 0) / 60);
          const m = (s.duration_minutes ?? 0) % 60;
          return (
            <li key={s.id}>
              <Card padding="sm">
                <div className="flex items-center gap-3 text-sm">
                  <WorkTypeDot
                    workType={s.work_type}
                    customColor={s.custom_work_type_color}
                  />
                  <span aria-hidden>{meta?.emoji ?? "•"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {s.custom_work_type_name ??
                        (language === "en"
                          ? meta?.label_en
                          : meta?.label_es)}{" "}
                      · {s.project_name}
                    </div>
                    {s.note && (
                      <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60 truncate">
                        {s.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs tabular-nums">
                      {h}h {m}m
                    </div>
                    <div className="text-[10px] font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50">
                      {s.started_at.slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSuspicious(s) && (
                      <span
                        title={t("session_flag_suspicious")}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold"
                        aria-label={t("session_flag_suspicious")}
                      >
                        !
                      </span>
                    )}
                    {s.edited_at && (
                      <span
                        title={t("session_flag_edited")}
                        aria-label={t("session_flag_edited")}
                        className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400"
                      />
                    )}
                    {!s.is_baseline && (
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        aria-label={t("session_edit_title")}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-ikigai-dark/70 dark:text-ikigai-cream/70"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {editing && (
        <SessionEditModal
          sessionId={editing.id}
          startedAt={editing.started_at}
          endedAt={editing.ended_at}
          editHistory={editing.edit_history ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["sessions-history"] });
            qc.invalidateQueries({ queryKey: ["sessions", "today"] });
          }}
        />
      )}

      {data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs font-mono">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="px-3 py-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] disabled:opacity-40"
          >
            ←
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            disabled={offset + PAGE_SIZE >= data.total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="px-3 py-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </main>
  );
}
