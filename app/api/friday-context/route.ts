import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { mondayOfWeekInTz } from "@/lib/notifications";

export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const weekStart = mondayOfWeekInTz(new Date(), current.kokuUser.timezone);
  const { rows } = await query<{ context: string; created_at: string }>(
    `SELECT context, created_at FROM friday_context
      WHERE user_id = $1 AND week_start = $2 LIMIT 1`,
    [current.user.id, weekStart]
  );
  return NextResponse.json({ week_start: weekStart, context: rows[0]?.context ?? null });
}

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as { context?: string };
  const context = body.context?.trim();
  if (!context) return jsonError("missing_context", 400);
  if (context.length > 100) return jsonError("too_long", 400);

  const weekStart = mondayOfWeekInTz(new Date(), current.kokuUser.timezone);
  await query(
    `INSERT INTO friday_context (user_id, week_start, context)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, week_start) DO UPDATE SET context = EXCLUDED.context`,
    [current.user.id, weekStart, context]
  );
  return NextResponse.json({ ok: true, week_start: weekStart }, { status: 201 });
}
