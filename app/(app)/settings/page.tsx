"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: me, refetch } = useCurrentUser();

  const [lang, setLang] = useState<"es" | "en">("es");
  const [ahStart, setAhStart] = useState("20:00");
  const [ahEnd, setAhEnd] = useState("07:00");
  const [mirror, setMirror] = useState(true);

  useEffect(() => {
    if (!me?.kokuUser) return;
    setLang(me.kokuUser.preferred_language);
    setAhStart(me.kokuUser.after_hours_start.slice(0, 5));
    setAhEnd(me.kokuUser.after_hours_end.slice(0, 5));
    setMirror(me.kokuUser.weekly_mirror_enabled);
  }, [me?.kokuUser]);

  const save = async (patch: Record<string, unknown>) => {
    await fetch("/api/me/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    refetch();
  };

  if (!me?.kokuUser) return null;
  const isOwner = me.kokuUser.role === "owner";

  return (
    <main className="flex-1 px-5 py-6 space-y-5">
      <h1 className="text-2xl font-heading">{t("settings_title")}</h1>

      <Card padding="md" className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_language")}
        </h2>
        <select
          value={lang}
          onChange={(e) => {
            const v = e.target.value as "es" | "en";
            setLang(v);
            save({ preferred_language: v });
          }}
          className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </Card>

      <Card padding="md" className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_after_hours")}
        </h2>
        <div className="flex gap-2">
          <input
            type="time"
            value={ahStart}
            onChange={(e) => setAhStart(e.target.value)}
            onBlur={() => save({ after_hours_start: ahStart })}
            className="flex-1 h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
          <input
            type="time"
            value={ahEnd}
            onChange={(e) => setAhEnd(e.target.value)}
            onBlur={() => save({ after_hours_end: ahEnd })}
            className="flex-1 h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </div>
      </Card>

      <Card padding="md" className="flex items-center justify-between">
        <span>{t("settings_mirror")}</span>
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => {
            setMirror(e.target.checked);
            save({ weekly_mirror_enabled: e.target.checked });
          }}
          className="w-6 h-6"
        />
      </Card>

      {isOwner && (
        <Card padding="md" className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
            Admin
          </h2>
          <Link
            href="/settings/work-types"
            className="block py-2 underline"
          >
            {t("settings_admin_work_types")}
          </Link>
        </Card>
      )}

      <Card padding="md" className="space-y-1">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_account")}
        </h2>
        <p className="text-sm">{me.user.name}</p>
        <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {me.user.email}
        </p>
      </Card>
    </main>
  );
}
