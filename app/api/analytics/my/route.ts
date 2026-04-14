import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { query } from "@/lib/db";
import {
  aiLeverage,
  burnoutStatus,
  type WeeklyHours,
  type FeedbackSummary,
} from "@/lib/analytics";

export async function GET(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id") ?? current.user.id;
  if (userId !== current.user.id && current.kokuUser.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tz = current.kokuUser.timezone;

  const t0 = Date.now();

  const { rows: weeklyRows } = await query<{
    week_start: string;
    work_type: string;
    total_minutes: string;
    is_baseline: boolean;
  }>(
    `WITH weeks AS (
       SELECT generate_series(
         date_trunc('week', NOW() AT TIME ZONE $2) - INTERVAL '11 weeks',
         date_trunc('week', NOW() AT TIME ZONE $2),
         INTERVAL '1 week'
       )::date AS week_start
     )
     SELECT w.week_start::text AS week_start,
            COALESCE(s.work_type, 'other') AS work_type,
            COALESCE(SUM(s.duration_minutes), 0)::text AS total_minutes,
            COALESCE(BOOL_AND(s.is_baseline), false) AS is_baseline
       FROM weeks w
       LEFT JOIN sessions s
         ON s.user_id = $1
        AND s.is_active = false
        AND date_trunc('week', (s.started_at AT TIME ZONE $2))::date = w.week_start
      GROUP BY w.week_start, s.work_type
      ORDER BY w.week_start`,
    [userId, tz]
  );

  const weekMap = new Map<string, WeeklyHours>();
  for (const r of weeklyRows) {
    const entry =
      weekMap.get(r.week_start) ??
      ({
        week_start: r.week_start,
        total_minutes: 0,
        is_baseline: false,
        by_work_type: {},
      } as WeeklyHours);
    const m = Number(r.total_minutes);
    entry.total_minutes += m;
    entry.by_work_type[r.work_type] = (entry.by_work_type[r.work_type] ?? 0) + m;
    if (r.is_baseline && m > 0) entry.is_baseline = true;
    weekMap.set(r.week_start, entry);
  }
  const weekly_hours: WeeklyHours[] = [...weekMap.values()].sort((a, b) =>
    a.week_start < b.week_start ? -1 : 1
  );

  // Current and prior week AI leverage (real sessions only).
  const { rows: leverageRows } = await query<{
    bucket: string;
    work_type: string;
    minutes: string;
  }>(
    `SELECT CASE
             WHEN date_trunc('week', (s.started_at AT TIME ZONE $2)) =
                  date_trunc('week', NOW() AT TIME ZONE $2)
               THEN 'now'
             WHEN date_trunc('week', (s.started_at AT TIME ZONE $2)) =
                  date_trunc('week', NOW() AT TIME ZONE $2) - INTERVAL '1 week'
               THEN 'prev'
           END AS bucket,
           s.work_type,
           COALESCE(SUM(s.duration_minutes), 0)::text AS minutes
      FROM sessions s
     WHERE s.user_id = $1
       AND s.is_baseline = false
       AND s.is_active = false
       AND s.started_at >=
           date_trunc('week', NOW() AT TIME ZONE $2) - INTERVAL '1 week'
     GROUP BY 1, 2`,
    [userId, tz]
  );

  const nowByType: Record<string, number> = {};
  const prevByType: Record<string, number> = {};
  for (const r of leverageRows) {
    if (r.bucket === "now") nowByType[r.work_type] = Number(r.minutes);
    else if (r.bucket === "prev") prevByType[r.work_type] = Number(r.minutes);
  }
  const ai_leverage_ratio = aiLeverage(nowByType);
  const ai_leverage_ratio_prev_week = aiLeverage(prevByType);

  // Burnout signals (real sessions only).
  const { rows: burnRows } = await query<{
    daily_avg_minutes_7d: string;
    consecutive_long_days: string;
    weekend_sessions_4w: string;
    after_hours_sessions_4w: string;
    difficult_count: string;
    feedback_with_value: string;
  }>(
    `WITH daily AS (
       SELECT date_trunc('day', (s.started_at AT TIME ZONE $2))::date AS d,
              SUM(s.duration_minutes) AS minutes
         FROM sessions s
        WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
          AND s.started_at >= NOW() - INTERVAL '14 days'
        GROUP BY 1
     ),
     runs AS (
       SELECT d, minutes,
              (minutes >= 9*60)::int AS is_long,
              ROW_NUMBER() OVER (ORDER BY d DESC) AS rn
         FROM daily
     ),
     streak AS (
       SELECT COALESCE(MIN(rn), 0) - 1 AS first_non_long_rn
         FROM runs WHERE is_long = 0
     )
     SELECT
       (COALESCE((SELECT SUM(minutes) FROM daily WHERE d > NOW()::date - 7), 0)
          / 7.0)::text AS daily_avg_minutes_7d,
       (SELECT COUNT(*) FROM runs WHERE is_long = 1 AND rn <=
         COALESCE((SELECT first_non_long_rn FROM streak), (SELECT COUNT(*) FROM runs))
       )::text AS consecutive_long_days,
       (SELECT COUNT(*) FROM sessions s
          WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
            AND s.started_at >= NOW() - INTERVAL '28 days'
            AND EXTRACT(DOW FROM (s.started_at AT TIME ZONE $2)) IN (0, 6)
       )::text AS weekend_sessions_4w,
       (SELECT COUNT(*) FROM sessions s, koku_users k
          WHERE s.user_id = $1 AND k.id = $1
            AND s.is_baseline = false AND s.is_active = false
            AND s.started_at >= NOW() - INTERVAL '28 days'
            AND (
              (s.started_at AT TIME ZONE $2)::time >= k.after_hours_start
              OR (s.started_at AT TIME ZONE $2)::time < k.after_hours_end
            )
       )::text AS after_hours_sessions_4w,
       (SELECT COUNT(*) FROM sessions s
          WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
            AND s.started_at >= NOW() - INTERVAL '14 days'
            AND s.feedback = 'difficult'
       )::text AS difficult_count,
       (SELECT COUNT(*) FROM sessions s
          WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
            AND s.started_at >= NOW() - INTERVAL '14 days'
            AND s.feedback IS NOT NULL
       )::text AS feedback_with_value`,
    [userId, tz]
  );

  const bRow = burnRows[0];
  const dailyAvgMin = Number(bRow?.daily_avg_minutes_7d ?? 0);
  const difficultCount = Number(bRow?.difficult_count ?? 0);
  const feedbackTotal = Number(bRow?.feedback_with_value ?? 0);
  const burnoutBase = {
    daily_avg_hours_7d: dailyAvgMin / 60,
    consecutive_long_days: Number(bRow?.consecutive_long_days ?? 0),
    weekend_sessions_4w: Number(bRow?.weekend_sessions_4w ?? 0),
    after_hours_sessions_4w: Number(bRow?.after_hours_sessions_4w ?? 0),
    difficult_session_ratio_2w:
      feedbackTotal > 0 ? difficultCount / feedbackTotal : 0,
  };
  const burnout = { ...burnoutBase, status: burnoutStatus(burnoutBase) };

  // This week totals.
  const thisWeek = weekly_hours[weekly_hours.length - 1] ?? {
    total_minutes: 0,
    by_work_type: {},
  };
  const { rows: sessionCountRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sessions s
      WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
        AND s.started_at >= date_trunc('week', NOW() AT TIME ZONE $2)`,
    [userId, tz]
  );

  // Feedback summary (last 30 days).
  const { rows: fbRows } = await query<{ feedback: string | null; count: string }>(
    `SELECT feedback, COUNT(*)::text AS count
       FROM sessions
      WHERE user_id = $1 AND is_baseline = false AND is_active = false
        AND started_at >= NOW() - INTERVAL '30 days'
      GROUP BY feedback`,
    [userId]
  );
  const feedback_summary: FeedbackSummary = {
    difficult_count: 0,
    flowed_count: 0,
    blocked_count: 0,
    no_feedback_count: 0,
  };
  for (const r of fbRows) {
    const n = Number(r.count);
    if (r.feedback === "difficult") feedback_summary.difficult_count = n;
    else if (r.feedback === "flowed") feedback_summary.flowed_count = n;
    else if (r.feedback === "blocked") feedback_summary.blocked_count = n;
    else feedback_summary.no_feedback_count = n;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[analytics/my] ${Date.now() - t0}ms for user ${userId.slice(0, 6)}…`);
  }

  return NextResponse.json({
    weekly_hours,
    ai_leverage_ratio,
    ai_leverage_ratio_prev_week,
    burnout,
    this_week: {
      total_minutes: thisWeek.total_minutes,
      vs_baseline_minutes: thisWeek.total_minutes - 48 * 60,
      by_work_type: thisWeek.by_work_type,
      sessions_count: Number(sessionCountRows[0]?.count ?? 0),
    },
    feedback_summary,
  });
}
