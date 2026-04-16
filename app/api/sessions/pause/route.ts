import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";

type Body = { session_id?: string };

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.session_id) return jsonError("missing_session_id", 400);

  const { rows } = await query<{
    user_id: string;
    is_active: boolean;
    paused_at: string | null;
  }>(
    `SELECT user_id, is_active, paused_at FROM sessions WHERE id = $1 LIMIT 1`,
    [body.session_id]
  );
  const s = rows[0];
  if (!s) return jsonError("not_found", 404);
  if (s.user_id !== current.user.id) return jsonError("forbidden", 403);
  if (!s.is_active) return jsonError("not_active", 409);
  if (s.paused_at) return jsonError("already_paused", 409);

  const { rows: updated } = await query(
    `UPDATE sessions
        SET paused_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id, paused_at`,
    [body.session_id]
  );
  return NextResponse.json(updated[0]);
}
