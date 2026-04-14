"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "koku-push-dismissed";

function urlB64ToUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushPermissionPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    setVisible(true);
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        localStorage.setItem(STORAGE_KEY, "denied");
        setVisible(false);
        return;
      }
      const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pub) throw new Error("missing public key");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(pub),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub.toJSON()),
      });
      setVisible(false);
    } catch (e) {
      console.error("[push] enable failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="px-4 py-3 bg-ikigai-purple/10 border-b border-ikigai-purple/20 text-sm flex items-center gap-3">
      <span className="flex-1">{t("push_enable_cta")}</span>
      <Button size="sm" onClick={enable} loading={busy}>
        {t("push_enable_button")}
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="dismiss"
        className="text-ikigai-dark/60 dark:text-ikigai-cream/60 px-2"
      >
        ×
      </button>
    </div>
  );
}
