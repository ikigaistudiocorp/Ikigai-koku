import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { isWorkType } from "@/lib/sessions";

type Body = {
  project_id?: string;
  work_type?: string;
  custom_work_type_id?: string | null;
};

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const body = (await req.json().catch(() => ({}))) as Body;
  const { project_id, work_type, custom_work_type_id } = body;

  if (!project_id) return jsonError("missing_project_id", 400);
  if (!isWorkType(work_type)) return jsonError("invalid_work_type", 400);

  // Project must exist and not be archived. Owners may clock into any
  // non-archived project; non-owners must be a member.
  const { rows: projectRows } = await query<{
    id: string;
    status: string;
    is_member: boolean;
  }>(
    `SELECT p.id, p.status,
            EXISTS (
              SELECT 1 FROM project_members m
               WHERE m.project_id = p.id AND m.user_id = $2
            ) AS is_member
       FROM projects p
      WHERE p.id = $1
      LIMIT 1`,
    [project_id, current.user.id]
  );
  const project = projectRows[0];
  if (!project) return jsonError("project_not_found", 404);
  if (project.status === "archived") return jsonError("project_archived", 400);
  if (current.kokuUser.role !== "owner" && !project.is_member) {
    return jsonError("not_a_member", 403);
  }

  if (custom_work_type_id) {
    const { rows: cwt } = await query<{ scope: string; project_id: string | null }>(
      `SELECT scope, project_id FROM custom_work_types
        WHERE id = $1 AND status = 'active' LIMIT 1`,
      [custom_work_type_id]
    );
    const c = cwt[0];
    if (!c) return jsonError("invalid_custom_work_type", 400);
    if (c.scope === "project" && c.project_id !== project_id) {
      return jsonError("custom_work_type_project_mismatch", 400);
    }
  }

  try {
    const { rows } = await query<{ id: string; started_at: string }>(
      `INSERT INTO sessions (
         user_id, project_id, work_type, custom_work_type_id,
         started_at, is_active
       ) VALUES ($1, $2, $3, $4, NOW(), true)
       RETURNING id, started_at`,
      [current.user.id, project_id, work_type, custom_work_type_id ?? null]
    );
    return NextResponse.json(
      {
        id: rows[0].id,
        started_at: rows[0].started_at,
        user_id: current.user.id,
        project_id,
        work_type,
        custom_work_type_id: custom_work_type_id ?? null,
        is_active: true,
      },
      { status: 201 }
    );
  } catch (err) {
    // 23505 = unique violation — the sessions_one_active_per_user index
    // guarantees at most one active session per user.
    if (isUniqueViolation(err)) return jsonError("already_active", 409);
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}
