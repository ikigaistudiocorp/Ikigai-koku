"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Member = { id: string; name: string; email: string; role: string };

export function UsersAdmin({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "developer" | "project_lead">(
    "developer"
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || String(res.status));
      }
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("developer");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 px-5 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading">Team</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          + New
        </Button>
      </div>

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id}>
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
                    {m.email}
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-ikigai-dark/60 dark:text-ikigai-cream/60">
                  {m.role}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {open && (
        <Card padding="md" className="space-y-3">
          <form onSubmit={submit} className="space-y-3">
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
            <input
              placeholder="Temporary password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            />
            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as "owner" | "developer" | "project_lead"
                )
              }
              className="w-full h-11 px-3 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900"
            >
              <option value="developer">developer</option>
              <option value="project_lead">project_lead</option>
              <option value="owner">owner</option>
            </select>
            {err && <p className="text-sm text-ikigai-rose">{err}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving} fullWidth>
                Create
              </Button>
            </div>
          </form>
        </Card>
      )}
    </main>
  );
}
