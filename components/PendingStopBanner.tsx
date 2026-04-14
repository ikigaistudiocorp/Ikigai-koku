"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClockStore } from "@/store/clockStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/store/toastStore";

async function postStop(body: object) {
  const r = await fetch("/api/sessions/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()) as { discarded: boolean; duration_minutes?: number };
}

export function PendingStopBanner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();
  useEffect(() => {
    void useClockStore.persist.rehydrate();
  }, []);
  const pending = useClockStore((s) => s.pendingStop);
  const setPending = useClockStore((s) => s.setPendingStop);
  const attempting = useRef(false);

  useEffect(() => {
    if (!pending) return;

    const attempt = async () => {
      if (attempting.current) return;
      if (!navigator.onLine) return;
      attempting.current = true;
      try {
        const data = await postStop({
          session_id: pending.session_id,
          note: pending.note,
          feedback: pending.feedback,
        });
        setPending(null);
        qc.invalidateQueries({ queryKey: ["sessions", "active"] });
        qc.invalidateQueries({ queryKey: ["sessions", "today"] });
        toast(
          data.discarded
            ? t("clock_session_discarded")
            : t("clock_session_saved", {
                duration: "",
                type: "",
                project: "",
              }),
          data.discarded ? "warning" : "success"
        );
      } catch {
        // Leave it queued for the next attempt.
      } finally {
        attempting.current = false;
      }
    };

    void attempt();
    const id = window.setInterval(attempt, 30_000);
    const onOnline = () => void attempt();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [pending, setPending, qc, t]);

  if (!pending) return null;

  return (
    <div className="px-4 py-2 bg-ikigai-amber/20 border-b border-ikigai-amber/40 text-sm flex items-center gap-3">
      <span className="flex-1">{t("pending_stop_banner")}</span>
      <button
        type="button"
        onClick={() => {
          // Force-retry now.
          attempting.current = false;
          window.dispatchEvent(new Event("online"));
        }}
        disabled={!isOnline}
        className="text-xs underline disabled:opacity-50"
      >
        {t("pending_stop_retry")}
      </button>
    </div>
  );
}
