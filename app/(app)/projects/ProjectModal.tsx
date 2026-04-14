"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

type Member = { id: string; name: string; email: string };

export type ProjectFormInitial = {
  id?: string;
  name?: string;
  client_name?: string | null;
  billable?: boolean;
  hourly_rate?: string | null;
  member_ids?: string[];
  status?: "active" | "paused" | "archived";
};

export function ProjectModal({
  open,
  onClose,
  onSubmit,
  initial,
  team,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormInitial) => Promise<void> | void;
  initial?: ProjectFormInitial;
  team: Member[];
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [client, setClient] = useState(initial?.client_name ?? "");
  const [billable, setBillable] = useState(initial?.billable ?? true);
  const [rate, setRate] = useState(initial?.hourly_rate ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(
    initial?.member_ids ?? []
  );
  const [status, setStatus] = useState<"active" | "paused" | "archived">(
    initial?.status ?? "active"
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (id: string) =>
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr(t("common_error"));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        id: initial?.id,
        name: name.trim(),
        client_name: client.trim() || null,
        billable,
        hourly_rate: billable && rate ? String(rate) : null,
        member_ids: memberIds,
        status,
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("projects_new")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm mb-1 block">{t("projects_form_name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-12 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </label>
        <label className="block">
          <span className="text-sm mb-1 block">
            {t("projects_form_client")}
          </span>
          <input
            value={client ?? ""}
            onChange={(e) => setClient(e.target.value)}
            className="w-full h-12 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
          />
        </label>

        <label className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm">{t("projects_form_billable")}</span>
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="w-5 h-5"
          />
        </label>

        {billable && (
          <label className="block">
            <span className="text-sm mb-1 block">
              {t("projects_form_hourly_rate")}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={0.01}
              min={0}
              value={rate ?? ""}
              onChange={(e) => setRate(e.target.value)}
              className="w-full h-12 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
          </label>
        )}

        {initial?.id && (
          <label className="block">
            <span className="text-sm mb-1 block">{t("projects_form_status")}</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "paused" | "archived")
              }
              className="w-full h-12 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            >
              <option value="active">{t("projects_status_active")}</option>
              <option value="paused">{t("projects_status_paused")}</option>
              <option value="archived">{t("projects_status_archived")}</option>
            </select>
          </label>
        )}

        <div>
          <span className="text-sm mb-1 block">
            {t("projects_form_members")}
          </span>
          <ul className="space-y-1">
            {team.map((m) => (
              <li key={m.id}>
                <label className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={memberIds.includes(m.id)}
                    onChange={() => toggle(m.id)}
                    className="w-5 h-5"
                  />
                  <span>
                    {m.name}{" "}
                    <span className="text-xs text-ikigai-dark/50 dark:text-ikigai-cream/50">
                      {m.email}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {err && <p className="text-sm text-ikigai-rose">{err}</p>}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            fullWidth
            size="md"
          >
            {t("common_cancel")}
          </Button>
          <Button type="submit" loading={saving} fullWidth size="md">
            {t("common_save")}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
