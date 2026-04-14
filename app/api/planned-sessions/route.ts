import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { isWorkType, MAX_NOTE_LENGTH } from "@/lib/sessions";

type Body = {
  project_id?: string;
  work_type?: string;
  custom_work_type_id?: string | null;
  note?: string | null;
};

export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const { rows } = await query(
    `SELECT p.id, p.project_id, pr.name AS project_name, p.work_type,
            p.custom_work_type_id, c.name AS custom_work_type_name,
            c.color AS custom_work_type_color, p.note, p.created_at
       FROM planned_sessions p
       JOIN projects pr ON pr.id = p.project_id
       LEFT JOIN custom_work_types c ON c.id = p.custom_work_type_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC`,
    [current.user.id]
  );
  return NextResponse.json({ planned: rows });
}

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.project_id) return jsonError("missing_project_id", 400);
  if (!body.work_type || !isWorkType(body.work_type)) {
    return jsonError("invalid_work_type", 400);
  }
  const note =
    typeof body.note === "string" ? body.note.slice(0, MAX_NOTE_LENGTH) : null;

  const { rows: proj } = await query<{ id: string }>(
    `SELECT id FROM projects WHERE id = $1 AND status = 'active' LIMIT 1`,
    [body.project_id]
  );
  if (proj.length === 0) return jsonError("invalid_project", 400);

  let customId: string | null = null;
  if (body.custom_work_type_id) {
    const { rows: c } = await query<{ scope: string; project_id: string | null }>(
      `SELECT scope, project_id FROM custom_work_types
        WHERE id = $1 AND status = 'active' LIMIT 1`,
      [body.custom_work_type_id]
    );
    if (c.length === 0) return jsonError("invalid_custom_work_type", 400);
    if (c[0].scope === "project" && c[0].project_id !== body.project_id) {
      return jsonError("custom_work_type_project_mismatch", 400);
    }
    customId = body.custom_work_type_id;
  }

  const { rows } = await query(
    `INSERT INTO planned_sessions
       (user_id, project_id, work_type, custom_work_type_id, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, project_id, work_type, custom_work_type_id, note, created_at`,
    [current.user.id, body.project_id, body.work_type, customId, note]
  );
  return NextResponse.json(rows[0]);
}
