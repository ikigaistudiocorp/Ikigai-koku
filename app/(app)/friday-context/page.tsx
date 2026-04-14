"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export default function FridayContextPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/friday-context", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && d.context && setText(d.context))
      .catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/friday-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ context: text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.replace("/clock");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 px-5 py-8 max-w-md mx-auto w-full space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-heading">{t("friday_ctx_title")}</h1>
        <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("friday_ctx_subtitle")}
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 100))}
          maxLength={100}
          rows={4}
          className="w-full rounded-lg p-3 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/15 text-base resize-none"
        />
        <p className="text-right text-xs font-mono text-ikigai-dark/50 dark:text-ikigai-cream/50">
          {text.length}/100
        </p>

        {err && <p className="text-sm text-ikigai-rose">{err}</p>}

        <div className="flex gap-2">
          <Button type="submit" loading={saving} fullWidth>
            {t("common_save")}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => router.replace("/clock")}
          className="block w-full text-center text-sm underline text-ikigai-dark/60 dark:text-ikigai-cream/60"
        >
          {t("friday_ctx_skip")}
        </button>
      </form>
    </main>
  );
}
