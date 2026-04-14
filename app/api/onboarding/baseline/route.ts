import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { pool, query } from "@/lib/db";

const BASELINE_PROJECT_NAME = "__koku_baseline";

type Entry = {
  user_id: string;
  weeks_ago: number; // 1..8
  hours: number; // 0..80
};

type Body = { entries?: Entry[] };

function mondayOfThisWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(12, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (current.kokuUser.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const entries = body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "missing_entries" }, { status: 400 });
  }

  for (const e of entries) {
    if (
      !e.user_id ||
      typeof e.weeks_ago !== "number" ||
      e.weeks_ago < 1 ||
      e.weeks_ago > 8 ||
      typeof e.hours !== "number" ||
      e.hours < 0 ||
      e.hours > 80
    ) {
      return NextResponse.json({ error: "invalid_entry", entry: e }, { status: 400 });
    }
  }

  const userIds = Array.from(new Set(entries.map((e) => e.user_id)));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure all referenced users exist in koku_users.
    const { rows: existing } = await client.query<{ id: string }>(
      `SELECT id FROM koku_users WHERE id = ANY($1::text[])`,
      [userIds]
    );
    if (existing.length !== userIds.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "unknown_user" }, { status: 400 });
    }

    // Upsert the hidden baseline project (status='archived' keeps it out of
    // the regular project pickers).
    let baselineProjectId: string;
    const existingProject = await client.query<{ id: string }>(
      `SELECT id FROM projects WHERE name = $1 LIMIT 1`,
      [BASELINE_PROJECT_NAME]
    );
    if (existingProject.rows[0]) {
      baselineProjectId = existingProject.rows[0].id;
    } else {
      const created = await client.query<{ id: string }>(
        `INSERT INTO projects (name, status, billable, created_by)
         VALUES ($1, 'archived', false, $2)
         RETURNING id`,
        [BASELINE_PROJECT_NAME, current.user.id]
      );
      baselineProjectId = created.rows[0].id;
    }

    const monday = mondayOfThisWeek();

    for (const e of entries) {
      const weekStart = new Date(monday);
      weekStart.setUTCDate(weekStart.getUTCDate() - 7 * e.weeks_ago);
      // 09:00 local (we approximate local-noon + -3 UTC offset doesn't matter
      // for display; baseline rows are synthetic anyway).
      weekStart.setUTCHours(14, 0, 0, 0); // ~09:00 America/Panama (UTC-5)
      const durationMinutes = Math.round(e.hours * 60);
      const ended = new Date(weekStart.getTime() + durationMinutes * 60_000);

      await client.query(
        `INSERT INTO sessions (
           user_id, project_id, work_type,
           started_at, ended_at, duration_minutes,
           is_active, is_baseline
         )
         VALUES ($1, $2, 'other', $3, $4, $5, false, true)`,
        [e.user_id, baselineProjectId, weekStart.toISOString(), ended.toISOString(), durationMinutes]
      );
    }

    await client.query(
      `UPDATE koku_users SET baseline_completed = true WHERE id = ANY($1::text[])`,
      [userIds]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[baseline] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    client.release();
  }

  // Reflect flags back to the server helper's cache.
  void query;

  return NextResponse.json({ ok: true }, { status: 201 });
}
