import { NextResponse } from "next/server";
import { requireOwner, jsonError } from "@/lib/api";
import { query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) return jsonError("missing_name", 400);
  if (name.length > 40) return jsonError("name_too_long", 400);

  const { rows } = await query(
    `UPDATE custom_work_types SET name = $1 WHERE id = $2
      RETURNING id, name, scope, project_id, color, status, created_at`,
    [name, id]
  );
  if (rows.length === 0) return jsonError("not_found", 404);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const { rows } = await query<{ id: string }>(
    `UPDATE custom_work_types SET status = 'archived'
      WHERE id = $1 AND status = 'active'
      RETURNING id`,
    [id]
  );
  if (rows.length === 0) return jsonError("not_found_or_already_archived", 404);
  return NextResponse.json({ archived: true }, { status: 200 });
}
