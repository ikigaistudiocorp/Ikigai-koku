import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { query } from "@/lib/db";

export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const { rows } = await query<{
    id: string;
    user_id: string;
    project_id: string;
    work_type: string;
    custom_work_type_id: string | null;
    started_at: string;
    note: string | null;
    is_baseline: boolean;
    project_name: string;
    project_client: string | null;
  }>(
    `SELECT s.id, s.user_id, s.project_id, s.work_type, s.custom_work_type_id,
            s.started_at, s.note, s.is_baseline,
            p.name AS project_name, p.client_name AS project_client
       FROM sessions s
       JOIN projects p ON p.id = s.project_id
      WHERE s.user_id = $1 AND s.is_active = true
      LIMIT 1`,
    [current.user.id]
  );

  const row = rows[0];
  if (!row) return NextResponse.json(null);
  return NextResponse.json({
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    work_type: row.work_type,
    custom_work_type_id: row.custom_work_type_id,
    started_at: row.started_at,
    note: row.note,
    is_baseline: row.is_baseline,
    is_active: true,
    project: {
      id: row.project_id,
      name: row.project_name,
      client_name: row.project_client,
    },
  });
}
