import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import {
  isFeedback,
  isWorkType,
  MAX_NOTE_LENGTH,
  MIN_DURATION_MINUTES,
} from "@/lib/sessions";

type Body = {
  project_id?: string;
  work_type?: string;
  custom_work_type_id?: string | null;
  started_at?: string;
  ended_at?: string;
  note?: string | null;
  feedback?: string | null;
};

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.project_id) return jsonError("missing_project_id", 400);
  if (!body.work_type || !isWorkType(body.work_type)) {
    return jsonError("invalid_work_type", 400);
  }
  if (!body.started_at || !body.ended_at) {
    return jsonError("missing_times", 400);
  }
  const startedMs = new Date(body.started_at).getTime();
  const endedMs = new Date(body.ended_at).getTime();
  if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs)) {
    return jsonError("invalid_times", 400);
  }
  if (endedMs <= startedMs) return jsonError("ended_before_start", 400);
  if (endedMs > Date.now() + 60_000) return jsonError("ended_in_future", 400);

  const durationMinutes = Math.round((endedMs - startedMs) / 60_000);
  if (durationMinutes < MIN_DURATION_MINUTES) {
    return jsonError("too_short", 400);
  }

  const note =
    typeof body.note === "string" ? body.note.slice(0, MAX_NOTE_LENGTH) : null;

  const feedback =
    body.feedback === null || body.feedback === undefined
      ? null
      : isFeedback(body.feedback)
        ? body.feedback
        : undefined;
  if (feedback === undefined) return jsonError("invalid_feedback", 400);

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

  // Flag as manually created so the client shows the yellow "edited" dot.
  const creationEntry = {
    at: new Date().toISOString(),
    by_user_id: current.user.id,
    by_user_name: current.user.name ?? null,
    changes: { created_manually: { from: null, to: "true" } },
  };

  const { rows } = await query(
    `INSERT INTO sessions
       (user_id, project_id, work_type, custom_work_type_id,
        started_at, ended_at, duration_minutes, note, feedback,
        is_active, is_baseline, edited_at, edit_history)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, false, NOW(), $10::jsonb)
     RETURNING id, started_at, ended_at, duration_minutes`,
    [
      current.user.id,
      body.project_id,
      body.work_type,
      customId,
      new Date(startedMs).toISOString(),
      new Date(endedMs).toISOString(),
      durationMinutes,
      note,
      feedback,
      JSON.stringify([creationEntry]),
    ]
  );
  return NextResponse.json(rows[0]);
}
