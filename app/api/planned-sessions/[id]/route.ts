import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM planned_sessions WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (rows.length === 0) return jsonError("not_found", 404);
  if (rows[0].user_id !== current.user.id) return jsonError("forbidden", 403);
  await query(`DELETE FROM planned_sessions WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
