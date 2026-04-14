"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";

export default function MirrorPreviewPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/weekly-mirror/preview", { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { preview: string };
      setText(j.preview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-4">
      <h1 className="text-2xl font-heading">{t("settings_mirror")}</h1>
      <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
        {t("mirror_preview_note")}
      </p>
      <Button onClick={load} loading={loading}>
        {t("mirror_preview_cta")}
      </Button>
      {err && <p className="text-sm text-ikigai-rose">{err}</p>}
      {text && (
        <Card padding="lg" className="whitespace-pre-wrap text-sm leading-6">
          {text}
        </Card>
      )}
    </main>
  );
}
