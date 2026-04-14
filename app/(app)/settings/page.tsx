"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth-client";

async function saveSettings(patch: Record<string, unknown>) {
  await fetch("/api/me/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: me, refetch } = useCurrentUser();
  const router = useRouter();

  if (!me?.kokuUser) return null;

  const ku = me.kokuUser;
  const isOwner = ku.role === "owner";
  const afterStart = ku.after_hours_start.slice(0, 5);
  const afterEnd = ku.after_hours_end.slice(0, 5);

  const save = async (patch: Record<string, unknown>) => {
    await saveSettings(patch);
    refetch();
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-5">
      <h1 className="text-2xl font-heading">{t("settings_title")}</h1>

      <Card padding="md" className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_language")}
        </h2>
        <select
          key={`lang-${ku.preferred_language}`}
          defaultValue={ku.preferred_language}
          onChange={(e) => save({ preferred_language: e.target.value })}
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
            key={`ah-start-${afterStart}`}
            type="time"
            defaultValue={afterStart}
            onBlur={(e) => save({ after_hours_start: e.target.value })}
            className="flex-1 h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
          <input
            key={`ah-end-${afterEnd}`}
            type="time"
            defaultValue={afterEnd}
            onBlur={(e) => save({ after_hours_end: e.target.value })}
            className="flex-1 h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </div>
      </Card>

      <Card padding="md" className="flex items-center justify-between">
        <span>{t("settings_mirror")}</span>
        <input
          key={`mirror-${ku.weekly_mirror_enabled}`}
          type="checkbox"
          defaultChecked={ku.weekly_mirror_enabled}
          onChange={(e) => save({ weekly_mirror_enabled: e.target.checked })}
          className="w-6 h-6"
        />
      </Card>

      {isOwner && (
        <Card padding="md" className="space-y-1">
          <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60 mb-1">
            Admin
          </h2>
          <Link
            href="/settings/users"
            className="flex items-center justify-between py-2 border-t border-black/[0.05] dark:border-white/[0.06]"
          >
            <span>{t("settings_admin_users")}</span>
            <span className="text-ikigai-purple">→</span>
          </Link>
          <Link
            href="/settings/work-types"
            className="flex items-center justify-between py-2 border-t border-black/[0.05] dark:border-white/[0.06]"
          >
            <span>{t("settings_admin_work_types")}</span>
            <span className="text-ikigai-purple">→</span>
          </Link>
        </Card>
      )}

      <Card padding="md" className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-mono text-ikigai-dark/60 dark:text-ikigai-cream/60">
          {t("settings_account")}
        </h2>
        <div>
          <p className="text-sm">{me.user.name}</p>
          <p className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {me.user.email}
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={async () => {
            await signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          {t("common_signout")}
        </Button>
      </Card>
    </main>
  );
}
