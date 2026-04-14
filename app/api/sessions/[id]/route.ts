import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { isWorkType, MAX_NOTE_LENGTH } from "@/lib/sessions";

type Body = {
  work_type?: string;
  custom_work_type_id?: string | null;
  note?: string | null;
};

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as Body;

  const { rows } = await query<{
    user_id: string;
    project_id: string;
    is_baseline: boolean;
  }>(
    `SELECT user_id, project_id, is_baseline FROM sessions WHERE id = $1 LIMIT 1`,
    [id]
  );
  const session = rows[0];
  if (!session) return jsonError("not_found", 404);

  const isOwner = current.kokuUser.role === "owner";
  if (session.user_id !== current.user.id && !isOwner) {
    return jsonError("forbidden", 403);
  }
  if (session.is_baseline) return jsonError("cannot_edit_baseline", 403);

  const updates: string[] = [];
  const params: unknown[] = [];
  const push = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (body.work_type !== undefined) {
    if (!isWorkType(body.work_type)) return jsonError("invalid_work_type", 400);
    updates.push(`work_type = ${push(body.work_type)}`);
  }

  if (body.custom_work_type_id !== undefined) {
    if (body.custom_work_type_id === null) {
      updates.push(`custom_work_type_id = NULL`);
    } else {
      const cwt = await query<{ scope: string; project_id: string | null }>(
        `SELECT scope, project_id FROM custom_work_types
          WHERE id = $1 AND status = 'active' LIMIT 1`,
        [body.custom_work_type_id]
      );
      const c = cwt.rows[0];
      if (!c) return jsonError("invalid_custom_work_type", 400);
      if (c.scope === "project" && c.project_id !== session.project_id) {
        return jsonError("custom_work_type_project_mismatch", 400);
      }
      updates.push(`custom_work_type_id = ${push(body.custom_work_type_id)}`);
    }
  }

  if (body.note !== undefined) {
    const trimmed =
      body.note === null ? null : body.note.slice(0, MAX_NOTE_LENGTH);
    updates.push(`note = ${push(trimmed)}`);
  }

  if (updates.length === 0) return jsonError("no_changes", 400);
  updates.push(`updated_at = NOW()`);

  params.push(id);
  const sql = `UPDATE sessions SET ${updates.join(", ")}
                WHERE id = $${params.length} RETURNING *`;
  const { rows: updated } = await query(sql, params);
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;
  if (current.kokuUser.role !== "owner") return jsonError("forbidden", 403);

  const { rows } = await query<{ is_baseline: boolean }>(
    `SELECT is_baseline FROM sessions WHERE id = $1 LIMIT 1`,
    [id]
  );
  const session = rows[0];
  if (!session) return jsonError("not_found", 404);
  if (session.is_baseline) return jsonError("cannot_delete_baseline", 403);

  await query(`DELETE FROM sessions WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
