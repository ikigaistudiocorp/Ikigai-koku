import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { isFeedback, MAX_NOTE_LENGTH, MIN_DURATION_MINUTES } from "@/lib/sessions";

type Body = {
  session_id?: string;
  note?: string | null;
  feedback?: string | null;
};

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const body = (await req.json().catch(() => ({}))) as Body;
  const { session_id } = body;
  if (!session_id) return jsonError("missing_session_id", 400);

  const note = typeof body.note === "string" ? body.note.slice(0, MAX_NOTE_LENGTH) : null;
  const feedback = body.feedback === null || body.feedback === undefined
    ? null
    : isFeedback(body.feedback)
      ? body.feedback
      : undefined;
  if (feedback === undefined) return jsonError("invalid_feedback", 400);

  const { rows } = await query<{
    id: string;
    started_at: string;
    user_id: string;
    is_active: boolean;
  }>(
    `SELECT id, started_at, user_id, is_active FROM sessions
      WHERE id = $1 LIMIT 1`,
    [session_id]
  );
  const session = rows[0];
  if (!session) return jsonError("session_not_found", 404);
  if (session.user_id !== current.user.id) return jsonError("forbidden", 403);
  if (!session.is_active) return jsonError("not_active", 409);

  const started = new Date(session.started_at).getTime();
  const durationMinutes = Math.max(0, Math.round((Date.now() - started) / 60_000));

  if (durationMinutes < MIN_DURATION_MINUTES) {
    await query(`DELETE FROM sessions WHERE id = $1`, [session.id]);
    return NextResponse.json({ discarded: true, duration_minutes: durationMinutes });
  }

  const { rows: updated } = await query(
    `UPDATE sessions
        SET ended_at = NOW(),
            duration_minutes = $2,
            note = $3,
            feedback = $4,
            is_active = false,
            updated_at = NOW()
      WHERE id = $1
      RETURNING id, ended_at, duration_minutes, note, feedback`,
    [session.id, durationMinutes, note, feedback]
  );

  return NextResponse.json({ discarded: false, ...updated[0] });
}
