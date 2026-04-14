"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";

export default function ReportsPage() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUser();
  const isOwner = me?.kokuUser?.role === "owner";

  return (
    <main className="flex-1 px-5 py-6 space-y-3">
      <h1 className="text-2xl font-heading">{t("reports_title")}</h1>
      <Link href="/reports/sessions" className="block">
        <Card padding="md" className="hover:border-ikigai-purple/60">
          <div className="flex items-center justify-between">
            <span>{t("reports_sessions")}</span>
            <span className="text-ikigai-purple">→</span>
          </div>
        </Card>
      </Link>
      <Link href="/reports/ai-leverage" className="block">
        <Card padding="md" className="hover:border-ikigai-purple/60">
          <div className="flex items-center justify-between">
            <span>{t("reports_ai_leverage")}</span>
            <span className="text-ikigai-purple">→</span>
          </div>
        </Card>
      </Link>
      {isOwner && (
        <Link href="/reports/kinko" className="block">
          <Card padding="md" className="hover:border-ikigai-purple/60">
            <div className="flex items-center justify-between">
              <span>{t("reports_kinko")}</span>
              <span className="text-ikigai-purple">→</span>
            </div>
          </Card>
        </Link>
      )}
    </main>
  );
}
