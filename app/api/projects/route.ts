import { NextResponse } from "next/server";
import { requireAuth, requireOwner, jsonError } from "@/lib/api";
import { pool, query } from "@/lib/db";

// Minimal GET for the clock picker. Full CRUD lands in Phase 2.3.
export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const isOwner = current.kokuUser.role === "owner";
  const { rows } = await query(
    `SELECT p.id, p.name, p.client_name, p.status, p.billable,
            p.hourly_rate::text AS hourly_rate,
            p.created_by, p.created_at,
            COALESCE((
              SELECT SUM(s.duration_minutes)::int
                FROM sessions s
               WHERE s.project_id = p.id
                 AND s.is_baseline = false
                 AND s.is_active = false
                 AND ($2 = true OR s.user_id = $1)
            ), 0) AS accumulated_minutes,
            (SELECT MAX(s.started_at)
               FROM sessions s
              WHERE s.project_id = p.id
                AND ($2 = true OR s.user_id = $1)
            ) AS last_activity_at
       FROM projects p
      WHERE p.status != 'archived'
        AND ($2 = true
             OR EXISTS (
               SELECT 1 FROM project_members m
                WHERE m.project_id = p.id AND m.user_id = $1
             ))
      ORDER BY p.name ASC`,
    [current.user.id, isOwner]
  );

  // Recent projects (last 10 started sessions for this user).
  const { rows: recent } = await query<{ project_id: string }>(
    `SELECT DISTINCT ON (project_id) project_id
       FROM sessions
      WHERE user_id = $1 AND is_baseline = false
      ORDER BY project_id, started_at DESC`,
    [current.user.id]
  );

  return NextResponse.json({
    projects: rows,
    recent_project_ids: recent.map((r) => r.project_id),
  });
}

type PostBody = {
  name?: string;
  client_name?: string | null;
  billable?: boolean;
  hourly_rate?: number | null;
  member_ids?: string[];
  status?: "active" | "paused";
};

export async function POST(req: Request) {
  const current = await requireOwner();
  if (current instanceof Response) return current;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const name = body.name?.trim();
  if (!name) return jsonError("missing_name", 400);
  if (name.length > 80) return jsonError("name_too_long", 400);
  if (body.billable && body.hourly_rate != null && body.hourly_rate < 0) {
    return jsonError("invalid_rate", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO projects (name, client_name, status, billable, hourly_rate, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        name,
        body.client_name ?? null,
        body.status ?? "active",
        body.billable ?? true,
        body.hourly_rate ?? null,
        current.user.id,
      ]
    );
    const projectId = rows[0].id;

    const members = (body.member_ids ?? []).filter((id) => typeof id === "string");
    if (members.length > 0) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id)
         SELECT $1, u FROM UNNEST($2::text[]) AS u
         ON CONFLICT DO NOTHING`,
        [projectId, members]
      );
    }
    await client.query("COMMIT");
    return NextResponse.json({ id: projectId }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
