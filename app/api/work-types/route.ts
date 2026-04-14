import { NextResponse } from "next/server";
import { requireAuth, requireOwner, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { CUSTOM_WORK_TYPE_PALETTE } from "@/lib/sessions";

// GET /api/work-types?project_id=... — returns active custom types available
// to the caller. Built-in types are not listed here (they live in types/index).
export async function GET(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("project_id");

  const { rows } = await query(
    `SELECT id, name, scope, project_id, color, status, created_at
       FROM custom_work_types
      WHERE status = 'active'
        AND (scope = 'global' OR project_id = $1)
      ORDER BY scope DESC, name ASC`,
    [projectId]
  );

  return NextResponse.json({ custom_work_types: rows });
}

type PostBody = {
  name?: string;
  scope?: string;
  project_id?: string | null;
};

export async function POST(req: Request) {
  const current = await requireOwner();
  if (current instanceof Response) return current;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const name = body.name?.trim();
  const scope = body.scope;

  if (!name) return jsonError("missing_name", 400);
  if (name.length > 40) return jsonError("name_too_long", 400);
  if (scope !== "global" && scope !== "project") {
    return jsonError("invalid_scope", 400);
  }

  let projectId: string | null = null;
  if (scope === "project") {
    if (!body.project_id) return jsonError("missing_project_id", 400);
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM projects WHERE id = $1 LIMIT 1`,
      [body.project_id]
    );
    if (rows.length === 0) return jsonError("project_not_found", 404);
    projectId = body.project_id;
  }

  // Count existing active + archived types to pick the next palette color.
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM custom_work_types`
  );
  const idx =
    Number(countRows[0]?.count ?? 0) % CUSTOM_WORK_TYPE_PALETTE.length;
  const color = CUSTOM_WORK_TYPE_PALETTE[idx];

  const { rows: inserted } = await query(
    `INSERT INTO custom_work_types (name, scope, project_id, color, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, scope, project_id, color, status, created_at`,
    [name, scope, projectId, color, current.user.id]
  );

  return NextResponse.json(inserted[0], { status: 201 });
}
