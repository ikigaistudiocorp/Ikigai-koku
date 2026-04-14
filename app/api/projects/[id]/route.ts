import { NextResponse } from "next/server";
import { requireAuth, requireOwner, jsonError } from "@/lib/api";
import { pool, query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: string;
  client_name?: string | null;
  status?: "active" | "paused" | "archived";
  billable?: boolean;
  hourly_rate?: number | null;
  member_ids?: string[];
};

export async function GET(_req: Request, ctx: Ctx) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const isOwner = current.kokuUser.role === "owner";
  const { rows } = await query<{
    id: string;
    name: string;
    client_name: string | null;
    status: string;
    billable: boolean;
    hourly_rate: string | null;
    created_by: string | null;
    created_at: string;
    is_member: boolean;
  }>(
    `SELECT p.id, p.name, p.client_name, p.status, p.billable,
            p.hourly_rate::text AS hourly_rate,
            p.created_by, p.created_at,
            EXISTS (
              SELECT 1 FROM project_members m
               WHERE m.project_id = p.id AND m.user_id = $2
            ) AS is_member
       FROM projects p
      WHERE p.id = $1 LIMIT 1`,
    [id, current.user.id]
  );
  const project = rows[0];
  if (!project) return jsonError("not_found", 404);
  if (!isOwner && !project.is_member) return jsonError("forbidden", 403);

  // Members.
  const { rows: members } = await query<{
    user_id: string;
    name: string;
    email: string;
    role: string;
  }>(
    `SELECT m.user_id, u.name, u.email, k.role
       FROM project_members m
       JOIN "user" u ON u.id = m.user_id
       JOIN koku_users k ON k.id = m.user_id
      WHERE m.project_id = $1
      ORDER BY u.name`,
    [id]
  );

  // Aggregates for the caller — and (if owner) the team.
  const { rows: myStats } = await query<{
    work_type: string;
    minutes: string;
    window: string;
  }>(
    `WITH windows AS (
       SELECT 'all' AS w, '1900-01-01'::timestamptz AS since
       UNION ALL SELECT 'month', NOW() - INTERVAL '30 days'
       UNION ALL SELECT 'week',  NOW() - INTERVAL '7 days'
     )
     SELECT w.w AS window, s.work_type, COALESCE(SUM(s.duration_minutes), 0)::text AS minutes
       FROM windows w
       LEFT JOIN sessions s
         ON s.project_id = $1
        AND s.user_id = $2
        AND s.is_baseline = false
        AND s.is_active = false
        AND s.started_at >= w.since
      GROUP BY w.w, s.work_type`,
    [id, current.user.id]
  );

  const { rows: recent } = await query(
    `SELECT s.id, s.work_type, s.started_at, s.ended_at, s.duration_minutes,
            s.note, s.feedback, c.name AS custom_work_type_name
       FROM sessions s
       LEFT JOIN custom_work_types c ON c.id = s.custom_work_type_id
      WHERE s.project_id = $1 AND s.user_id = $2
        AND s.is_baseline = false AND s.is_active = false
      ORDER BY s.started_at DESC
      LIMIT 10`,
    [id, current.user.id]
  );

  const { rows: customTypes } = await query(
    `SELECT id, name, scope, color, status, created_at
       FROM custom_work_types
      WHERE scope = 'project' AND project_id = $1
      ORDER BY status, name`,
    [id]
  );

  let team: Array<{
    user_id: string;
    name: string;
    minutes: number;
    by_work_type: Record<string, number>;
  }> = [];
  if (isOwner) {
    const { rows: teamStats } = await query<{
      user_id: string;
      name: string;
      work_type: string;
      minutes: string;
    }>(
      `SELECT s.user_id, u.name, s.work_type,
              COALESCE(SUM(s.duration_minutes), 0)::text AS minutes
         FROM sessions s
         JOIN "user" u ON u.id = s.user_id
        WHERE s.project_id = $1
          AND s.is_baseline = false AND s.is_active = false
        GROUP BY s.user_id, u.name, s.work_type`,
      [id]
    );
    const byUser = new Map<string, {
      user_id: string; name: string; minutes: number;
      by_work_type: Record<string, number>;
    }>();
    for (const r of teamStats) {
      const m = Number(r.minutes ?? 0);
      const entry = byUser.get(r.user_id) ?? {
        user_id: r.user_id,
        name: r.name,
        minutes: 0,
        by_work_type: {},
      };
      entry.minutes += m;
      entry.by_work_type[r.work_type] = (entry.by_work_type[r.work_type] ?? 0) + m;
      byUser.set(r.user_id, entry);
    }
    team = [...byUser.values()].sort((a, b) => b.minutes - a.minutes);
  }

  // Normalize myStats into three buckets.
  const buckets: Record<string, Record<string, number>> = {
    all: {},
    month: {},
    week: {},
  };
  for (const r of myStats) {
    const w = r.window;
    if (!r.work_type) continue;
    buckets[w][r.work_type] = Number(r.minutes);
  }
  const totals: Record<string, number> = {};
  for (const [w, map] of Object.entries(buckets)) {
    totals[w] = Object.values(map).reduce((a, b) => a + b, 0);
  }

  return NextResponse.json({
    project,
    members,
    my: {
      minutes_all_time: totals.all,
      minutes_month: totals.month,
      minutes_week: totals.week,
      by_work_type_all: buckets.all,
    },
    recent_sessions: recent,
    custom_work_types: customTypes,
    team,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const updates: string[] = [];
  const params: unknown[] = [];
  const push = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return jsonError("missing_name", 400);
    if (name.length > 80) return jsonError("name_too_long", 400);
    updates.push(`name = ${push(name)}`);
  }
  if (body.client_name !== undefined) {
    updates.push(
      `client_name = ${body.client_name === null ? "NULL" : push(body.client_name)}`
    );
  }
  if (body.status !== undefined) {
    if (!["active", "paused", "archived"].includes(body.status))
      return jsonError("invalid_status", 400);
    updates.push(`status = ${push(body.status)}`);
  }
  if (body.billable !== undefined) updates.push(`billable = ${push(body.billable)}`);
  if (body.hourly_rate !== undefined) {
    if (body.hourly_rate !== null && body.hourly_rate < 0)
      return jsonError("invalid_rate", 400);
    updates.push(
      `hourly_rate = ${body.hourly_rate === null ? "NULL" : push(body.hourly_rate)}`
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (updates.length > 0) {
      params.push(id);
      await client.query(
        `UPDATE projects SET ${updates.join(", ")} WHERE id = $${params.length}`,
        params
      );
    }
    if (body.member_ids) {
      await client.query(`DELETE FROM project_members WHERE project_id = $1`, [id]);
      if (body.member_ids.length > 0) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id)
             SELECT $1, u FROM UNNEST($2::text[]) AS u
           ON CONFLICT DO NOTHING`,
          [id, body.member_ids]
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const { rows } = await query<{ name: string }>(
    `SELECT name FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (rows.length === 0) return jsonError("not_found", 404);

  // Refuse to nuke the hidden baseline bucket — would orphan the onboarding
  // history.
  if (rows[0].name === "__koku_baseline") {
    return jsonError("cannot_delete_baseline_project", 409);
  }

  // FK cascades now take care of project_members, sessions, and project-
  // scoped custom_work_types.
  await query(`DELETE FROM projects WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
