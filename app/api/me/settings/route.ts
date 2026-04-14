import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";

type Body = {
  preferred_language?: "es" | "en";
  after_hours_start?: string;
  after_hours_end?: string;
  weekly_mirror_enabled?: boolean;
};

export async function PATCH(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as Body;

  const updates: string[] = [];
  const params: unknown[] = [];
  const push = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (body.preferred_language) {
    if (body.preferred_language !== "es" && body.preferred_language !== "en") {
      return jsonError("invalid_language", 400);
    }
    updates.push(`preferred_language = ${push(body.preferred_language)}`);
  }
  if (body.after_hours_start !== undefined)
    updates.push(`after_hours_start = ${push(body.after_hours_start)}`);
  if (body.after_hours_end !== undefined)
    updates.push(`after_hours_end = ${push(body.after_hours_end)}`);
  if (body.weekly_mirror_enabled !== undefined)
    updates.push(`weekly_mirror_enabled = ${push(body.weekly_mirror_enabled)}`);

  if (updates.length === 0) return jsonError("no_changes", 400);

  params.push(current.user.id);
  await query(
    `UPDATE koku_users SET ${updates.join(", ")} WHERE id = $${params.length}`,
    params
  );
  return NextResponse.json({ ok: true });
}
