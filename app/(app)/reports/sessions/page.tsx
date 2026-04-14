"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";
import { WORK_TYPE_META, type WorkType } from "@/types";

type SessionRow = {
  id: string;
  user_id: string;
  user_name: string;
  project_id: string;
  project_name: string;
  work_type: string;
  custom_work_type_name: string | null;
  duration_minutes: number | null;
  started_at: string;
  note: string | null;
  feedback: string | null;
};

type ListResponse = {
  sessions: SessionRow[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 25;

export default function SessionsHistoryPage() {
  const { t, language } = useTranslation();
  const [offset, setOffset] = useState(0);

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
      <h1 className="text-2xl font-heading">{t("reports_sessions")}</h1>

      <ul className="space-y-1">
        {data.sessions.map((s) => {
          const meta = WORK_TYPE_META[s.work_type as WorkType];
          const h = Math.floor((s.duration_minutes ?? 0) / 60);
          const m = (s.duration_minutes ?? 0) % 60;
          return (
            <li key={s.id}>
              <Card padding="sm">
                <div className="flex items-center gap-3 text-sm">
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
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

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
