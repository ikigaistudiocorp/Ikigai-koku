"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type EditHistoryEntry = {
  at: string;
  by_user_id: string;
  by_user_name: string | null;
  changes: Record<string, { from: string | null; to: string | null }>;
};

type Props = {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  editHistory: EditHistoryEntry[];
  onClose: () => void;
  onSaved: () => void;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function fmtHistoryValue(v: string | null): string {
  if (v === null) return "∅";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return v;
  return d.toLocaleString();
}

export function SessionEditModal({
  sessionId,
  startedAt,
  endedAt,
  editHistory,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [start, setStart] = useState(toLocalInput(startedAt));
  const [end, setEnd] = useState(toLocalInput(endedAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const now = new Date();
  const invalid =
    !Number.isFinite(startDate.getTime()) ||
    (endDate &&
      (!Number.isFinite(endDate.getTime()) ||
        endDate <= startDate ||
        endDate > now));

  const save = async () => {
    if (invalid) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (startDate.toISOString() !== new Date(startedAt).toISOString()) {
        body.started_at = startDate.toISOString();
      }
      if (
        endDate &&
        (!endedAt || endDate.toISOString() !== new Date(endedAt).toISOString())
      ) {
        body.ended_at = endDate.toISOString();
      }
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
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

  const del = async () => {
    if (!confirm(t("session_edit_delete_confirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <Card padding="lg" className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-heading">{t("session_edit_title")}</h2>

        <label className="block text-sm space-y-1">
          <span className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("session_edit_start")}
          </span>
          <input
            type="datetime-local"
            value={start}
            max={toLocalInput(now.toISOString())}
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
            max={toLocalInput(now.toISOString())}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </label>

        {invalid && (
          <p className="text-xs text-red-600">{t("session_edit_invalid")}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose} disabled={busy}>
            {t("session_edit_cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={save}
            loading={busy}
            disabled={!!invalid}
          >
            {t("session_edit_save")}
          </Button>
        </div>

        <Button
          variant="danger"
          fullWidth
          size="sm"
          onClick={del}
          disabled={busy}
        >
          {t("session_edit_delete")}
        </Button>

        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
          <h3 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60 mb-2">
            {t("session_edit_history")}
          </h3>
          {editHistory.length === 0 ? (
            <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
              {t("session_edit_history_empty")}
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {editHistory.map((e, i) => (
                <li key={i} className="space-y-0.5">
                  <div className="font-mono text-[11px] text-ikigai-dark/60 dark:text-ikigai-cream/60">
                    {new Date(e.at).toLocaleString()} ·{" "}
                    {e.by_user_name ?? e.by_user_id}
                  </div>
                  <ul className="pl-3 space-y-0.5">
                    {Object.entries(e.changes).map(([field, diff]) => (
                      <li key={field}>
                        <span className="font-medium">{field}</span>:{" "}
                        {fmtHistoryValue(diff.from)} →{" "}
                        {fmtHistoryValue(diff.to)}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
