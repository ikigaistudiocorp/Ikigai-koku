import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { aiLeverage } from "@/lib/analytics";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;
  const tz = current.kokuUser.timezone;

  const isOwner = current.kokuUser.role === "owner";
  // Membership guard (owners exempt).
  const { rows: mem } = await query<{ is_member: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
     ) AS is_member`,
    [id, current.user.id]
  );
  if (!isOwner && !mem[0]?.is_member) return jsonError("forbidden", 403);

  const { rows: base } = await query<{
    work_type: string;
    minutes: string;
    difficult: string;
    flowed: string;
    blocked: string;
  }>(
    `SELECT s.work_type,
            COALESCE(SUM(s.duration_minutes), 0)::text AS minutes,
            COUNT(*) FILTER (WHERE feedback='difficult')::text AS difficult,
            COUNT(*) FILTER (WHERE feedback='flowed')::text AS flowed,
            COUNT(*) FILTER (WHERE feedback='blocked')::text AS blocked
       FROM sessions s
      WHERE s.project_id = $1 AND s.is_baseline = false AND s.is_active = false
      GROUP BY s.work_type`,
    [id]
  );

  const by_work_type: Record<string, number> = {};
  let total_minutes = 0;
  let difficult_count = 0;
  let flowed_count = 0;
  let blocked_count = 0;
  for (const r of base) {
    const m = Number(r.minutes);
    by_work_type[r.work_type] = m;
    total_minutes += m;
    difficult_count += Number(r.difficult);
    flowed_count += Number(r.flowed);
    blocked_count += Number(r.blocked);
  }

  const { rows: members } = await query<{
    user_id: string;
    name: string;
    work_type: string;
    minutes: string;
    difficult: string;
    flowed: string;
    total_feedback: string;
  }>(
    `SELECT s.user_id, u.name, s.work_type,
            SUM(s.duration_minutes)::text AS minutes,
            COUNT(*) FILTER (WHERE feedback='difficult')::text AS difficult,
            COUNT(*) FILTER (WHERE feedback='flowed')::text AS flowed,
            COUNT(*) FILTER (WHERE feedback IS NOT NULL)::text AS total_feedback
       FROM sessions s JOIN "user" u ON u.id = s.user_id
      WHERE s.project_id = $1 AND s.is_baseline = false AND s.is_active = false
      GROUP BY s.user_id, u.name, s.work_type`,
    [id]
  );

  const memberMap = new Map<string, {
    user_id: string;
    name: string;
    total_minutes: number;
    by_work_type: Record<string, number>;
    difficult: number;
    flowed: number;
    total_feedback: number;
  }>();
  for (const r of members) {
    const e = memberMap.get(r.user_id) ?? {
      user_id: r.user_id,
      name: r.name,
      total_minutes: 0,
      by_work_type: {},
      difficult: 0,
      flowed: 0,
      total_feedback: 0,
    };
    const m = Number(r.minutes);
    e.total_minutes += m;
    e.by_work_type[r.work_type] = (e.by_work_type[r.work_type] ?? 0) + m;
    e.difficult += Number(r.difficult);
    e.flowed += Number(r.flowed);
    e.total_feedback += Number(r.total_feedback);
    memberMap.set(r.user_id, e);
  }

  const { rows: weekly } = await query<{
    week_start: string;
    total_minutes: string;
  }>(
    `WITH weeks AS (
       SELECT generate_series(
         date_trunc('week', NOW() AT TIME ZONE $2) - INTERVAL '11 weeks',
         date_trunc('week', NOW() AT TIME ZONE $2),
         INTERVAL '1 week'
       )::date AS week_start
     )
     SELECT w.week_start::text AS week_start,
            COALESCE(SUM(s.duration_minutes), 0)::text AS total_minutes
       FROM weeks w
       LEFT JOIN sessions s
         ON s.project_id = $1 AND s.is_baseline = false AND s.is_active = false
        AND date_trunc('week', (s.started_at AT TIME ZONE $2))::date = w.week_start
      GROUP BY w.week_start
      ORDER BY w.week_start`,
    [id, tz]
  );

  return NextResponse.json({
    total_minutes,
    by_work_type,
    ai_leverage_ratio: aiLeverage(by_work_type),
    feedback_summary: { difficult_count, flowed_count, blocked_count },
    members: [...memberMap.values()].map((e) => ({
      ...e,
      ai_leverage_ratio: aiLeverage(e.by_work_type),
      feedback_sentiment:
        e.total_feedback < 3
          ? ("insufficient_data" as const)
          : e.difficult / e.total_feedback > 0.5
            ? ("negative" as const)
            : e.flowed / e.total_feedback > 0.5
              ? ("positive" as const)
              : ("neutral" as const),
    })),
    weekly_trend: weekly.map((r) => ({
      week_start: r.week_start,
      total_minutes: Number(r.total_minutes),
    })),
  });
}
