"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ExportPayload = {
  export_period: { from: string; to: string };
  sessions: Array<{
    date: string;
    user_name: string;
    project_name: string;
    client_name: string | null;
    work_type_label: string;
    custom_work_type_name: string | null;
    duration_hours: number;
    hourly_rate: number;
    line_total: number;
  }>;
  summary: {
    total_hours: number;
    total_billable_value: number;
  };
};

export default function KinkoExportPage() {
  const { t } = useTranslation();
  const { data: me, isLoading } = useCurrentUser();

  if (!isLoading && me && me.kokuUser.role !== "owner") redirect("/reports");

  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const { data: payload, error: err } = useQuery<ExportPayload>({
    queryKey: ["kinko-export", from, to],
    enabled: !!me && me.kokuUser.role === "owner",
    queryFn: async () => {
      const r = await fetch(
        `/api/kinko/export?from=${from}&to=${to}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
  });

  const download = (fmt: "json" | "csv") => {
    const u = `/api/kinko/export?from=${from}&to=${to}&format=${fmt}`;
    window.open(u, "_blank");
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-4">
      <h1 className="text-2xl font-heading">{t("reports_kinko")}</h1>

      <Card padding="md" className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
              {t("reports_filter_from")}
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
          </label>
          <label>
            <span className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
              {t("reports_filter_to")}
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => download("json")}>
            {t("reports_export_json")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => download("csv")}>
            {t("reports_export_csv")}
          </Button>
        </div>

        {err && (
          <p className="text-sm text-ikigai-rose">
            {err instanceof Error ? err.message : String(err)}
          </p>
        )}

        {payload && (
          <div className="pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t("reports_summary_hours")}</span>
              <span className="font-mono tabular-nums">
                {payload.summary.total_hours}h
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("reports_summary_value")}</span>
              <span className="font-mono tabular-nums">
                ${payload.summary.total_billable_value.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {payload && payload.sessions.length > 0 && (
        <Card padding="sm" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/[0.06] dark:border-white/[0.06]">
                <th className="py-1 pr-3 font-normal">Date</th>
                <th className="py-1 pr-3 font-normal">Dev</th>
                <th className="py-1 pr-3 font-normal">Project</th>
                <th className="py-1 pr-3 font-normal">Work</th>
                <th className="py-1 pr-3 font-normal text-right">h</th>
                <th className="py-1 pr-3 font-normal text-right">$</th>
              </tr>
            </thead>
            <tbody>
              {payload.sessions.slice(0, 50).map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-black/[0.03] dark:border-white/[0.03]"
                >
                  <td className="py-1 pr-3 font-mono text-xs">{s.date}</td>
                  <td className="py-1 pr-3">{s.user_name}</td>
                  <td className="py-1 pr-3">{s.project_name}</td>
                  <td className="py-1 pr-3 truncate">
                    {s.custom_work_type_name ?? s.work_type_label}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {s.duration_hours}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {s.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
