import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { query } from "@/lib/db";

export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const { rows: sessions } = await query<{
    id: string;
    work_type: string;
    custom_work_type_name: string | null;
    custom_work_type_color: string | null;
    duration_minutes: number | null;
    started_at: string;
    ended_at: string | null;
    note: string | null;
    feedback: string | null;
    project_name: string;
  }>(
    `SELECT s.id, s.work_type, s.duration_minutes,
            s.started_at, s.ended_at, s.note, s.feedback,
            p.name AS project_name,
            c.name AS custom_work_type_name, c.color AS custom_work_type_color
       FROM sessions s
       JOIN projects p ON p.id = s.project_id
       LEFT JOIN custom_work_types c ON c.id = s.custom_work_type_id
      WHERE s.user_id = $1
        AND s.is_baseline = false
        AND s.is_active = false
        AND s.started_at >= date_trunc('day', NOW() AT TIME ZONE $2)
                              AT TIME ZONE $2
      ORDER BY s.started_at DESC`,
    [current.user.id, current.kokuUser.timezone]
  );

  const totalMinutes = sessions.reduce(
    (s, r) => s + (r.duration_minutes ?? 0),
    0
  );

  const byWorkType: Record<string, number> = {};
  for (const s of sessions) {
    byWorkType[s.work_type] = (byWorkType[s.work_type] ?? 0) + (s.duration_minutes ?? 0);
  }

  return NextResponse.json({
    sessions,
    total_minutes_today: totalMinutes,
    session_count: sessions.length,
    by_work_type: byWorkType,
  });
}
