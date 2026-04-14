import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { pool } from "@/lib/db";
import { isWorkType, MIN_DURATION_MINUTES } from "@/lib/sessions";

type Body = {
  session_id?: string;
  new_work_type?: string;
  new_custom_work_type_id?: string | null;
};

export async function PATCH(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const body = (await req.json().catch(() => ({}))) as Body;
  const { session_id, new_work_type, new_custom_work_type_id } = body;
  if (!session_id) return jsonError("missing_session_id", 400);
  if (!isWorkType(new_work_type)) return jsonError("invalid_work_type", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<{
      id: string;
      user_id: string;
      project_id: string;
      started_at: string;
      is_active: boolean;
    }>(
      `SELECT id, user_id, project_id, started_at, is_active
         FROM sessions WHERE id = $1 FOR UPDATE`,
      [session_id]
    );
    const session = existing.rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return jsonError("session_not_found", 404);
    }
    if (session.user_id !== current.user.id) {
      await client.query("ROLLBACK");
      return jsonError("forbidden", 403);
    }
    if (!session.is_active) {
      await client.query("ROLLBACK");
      return jsonError("not_active", 409);
    }

    if (new_custom_work_type_id) {
      const cwt = await client.query<{ scope: string; project_id: string | null }>(
        `SELECT scope, project_id FROM custom_work_types
          WHERE id = $1 AND status = 'active' LIMIT 1`,
        [new_custom_work_type_id]
      );
      const c = cwt.rows[0];
      if (!c) {
        await client.query("ROLLBACK");
        return jsonError("invalid_custom_work_type", 400);
      }
      if (c.scope === "project" && c.project_id !== session.project_id) {
        await client.query("ROLLBACK");
        return jsonError("custom_work_type_project_mismatch", 400);
      }
    }

    const started = new Date(session.started_at).getTime();
    const durationMinutes = Math.max(0, Math.round((Date.now() - started) / 60_000));

    // Stop the current segment (delete if too short, otherwise close it).
    if (durationMinutes < MIN_DURATION_MINUTES) {
      await client.query(`DELETE FROM sessions WHERE id = $1`, [session.id]);
    } else {
      await client.query(
        `UPDATE sessions
            SET ended_at = NOW(),
                duration_minutes = $2,
                is_active = false,
                updated_at = NOW()
          WHERE id = $1`,
        [session.id, durationMinutes]
      );
    }

    const inserted = await client.query<{ id: string; started_at: string }>(
      `INSERT INTO sessions (
         user_id, project_id, work_type, custom_work_type_id,
         started_at, is_active
       ) VALUES ($1, $2, $3, $4, NOW(), true)
       RETURNING id, started_at`,
      [
        session.user_id,
        session.project_id,
        new_work_type,
        new_custom_work_type_id ?? null,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        id: inserted.rows[0].id,
        started_at: inserted.rows[0].started_at,
        project_id: session.project_id,
        work_type: new_work_type,
        custom_work_type_id: new_custom_work_type_id ?? null,
        is_active: true,
      },
      { status: 201 }
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
