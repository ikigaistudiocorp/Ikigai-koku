import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/api";
import { query } from "@/lib/db";
import {
  aiLeverage,
  burnoutStatus,
  consecutiveWeeksOver85,
  hireSignalStatus,
  type WeeklyHours,
} from "@/lib/analytics";

export async function GET() {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const ownerTz = current.kokuUser.timezone;

  const t0 = Date.now();

  const { rows: users } = await query<{
    id: string;
    name: string;
    timezone: string;
  }>(
    `SELECT u.id, u.name, k.timezone
       FROM koku_users k JOIN "user" u ON u.id = k.id
      ORDER BY u.name`
  );

  // Per-member this-week totals + AI leverage (real sessions only, last 30d).
  const { rows: perMember } = await query<{
    user_id: string;
    this_week_minutes: string;
    work_type: string | null;
    ratio_minutes: string;
  }>(
    `SELECT k.id AS user_id,
            (SELECT COALESCE(SUM(s.duration_minutes), 0)
               FROM sessions s
              WHERE s.user_id = k.id AND s.is_baseline = false
                AND s.is_active = false
                AND s.started_at >= date_trunc('week', NOW() AT TIME ZONE $1))
              ::text AS this_week_minutes,
            s.work_type,
            COALESCE(SUM(s.duration_minutes) FILTER (
              WHERE s.started_at >= NOW() - INTERVAL '30 days'
            ), 0)::text AS ratio_minutes
       FROM koku_users k
       LEFT JOIN sessions s
         ON s.user_id = k.id AND s.is_baseline = false AND s.is_active = false
      GROUP BY k.id, s.work_type`,
    [ownerTz]
  );

  // Per-member feedback sentiment (last 14 days).
  const { rows: sentiment } = await query<{
    user_id: string;
    difficult: string;
    flowed: string;
    total: string;
  }>(
    `SELECT s.user_id,
            COUNT(*) FILTER (WHERE feedback = 'difficult')::text AS difficult,
            COUNT(*) FILTER (WHERE feedback = 'flowed')::text AS flowed,
            COUNT(*) FILTER (WHERE feedback IS NOT NULL)::text AS total
       FROM sessions s
      WHERE s.is_baseline = false AND s.is_active = false
        AND s.started_at >= NOW() - INTERVAL '14 days'
      GROUP BY s.user_id`
  );
  const sentimentByUser = new Map<string, { difficult: number; flowed: number; total: number }>();
  for (const r of sentiment) {
    sentimentByUser.set(r.user_id, {
      difficult: Number(r.difficult),
      flowed: Number(r.flowed),
      total: Number(r.total),
    });
  }

  // 12-week capacity trend (real + baseline, per member).
  const { rows: trend } = await query<{
    user_id: string;
    name: string;
    week_start: string;
    total_minutes: string;
    is_baseline: boolean;
  }>(
    `WITH weeks AS (
       SELECT generate_series(
         date_trunc('week', NOW() AT TIME ZONE $1) - INTERVAL '11 weeks',
         date_trunc('week', NOW() AT TIME ZONE $1),
         INTERVAL '1 week'
       )::date AS week_start
     ),
     roster AS (
       SELECT k.id AS user_id, u.name FROM koku_users k JOIN "user" u ON u.id = k.id
     )
     SELECT r.user_id, r.name, w.week_start::text AS week_start,
            COALESCE(SUM(s.duration_minutes), 0)::text AS total_minutes,
            COALESCE(BOOL_AND(s.is_baseline), false) AS is_baseline
       FROM roster r
       CROSS JOIN weeks w
       LEFT JOIN sessions s
         ON s.user_id = r.user_id
        AND s.is_active = false
        AND date_trunc('week', (s.started_at AT TIME ZONE $1))::date = w.week_start
      GROUP BY r.user_id, r.name, w.week_start
      ORDER BY r.name, w.week_start`,
    [ownerTz]
  );

  // Group per-member data.
  const memberMap = new Map<string, {
    user_id: string;
    name: string;
    this_week_minutes: number;
    by_work_type: Record<string, number>;
    weekly: WeeklyHours[];
  }>();
  for (const u of users) {
    memberMap.set(u.id, {
      user_id: u.id,
      name: u.name,
      this_week_minutes: 0,
      by_work_type: {},
      weekly: [],
    });
  }
  for (const r of perMember) {
    const entry = memberMap.get(r.user_id);
    if (!entry) continue;
    entry.this_week_minutes = Number(r.this_week_minutes);
    if (r.work_type) {
      entry.by_work_type[r.work_type] =
        (entry.by_work_type[r.work_type] ?? 0) + Number(r.ratio_minutes);
    }
  }
  for (const r of trend) {
    const entry = memberMap.get(r.user_id);
    if (!entry) continue;
    entry.weekly.push({
      week_start: r.week_start,
      total_minutes: Number(r.total_minutes),
      is_baseline: r.is_baseline,
      by_work_type: {},
    });
  }

  // Compute each member's burnout status by hitting /api/analytics/my-style
  // signals in one shot. Keep the query compact — we only need the 3
  // headline signals (daily avg, consecutive days, weekend 4w) plus
  // difficult-feedback ratio.
  const { rows: burnRows } = await query<{
    user_id: string;
    daily_avg_minutes_7d: string;
    weekend_sessions_4w: string;
    consecutive_long_days: string;
    difficult_count: string;
    feedback_total: string;
  }>(
    `WITH per_user AS (
       SELECT k.id AS user_id, k.timezone FROM koku_users k
     ),
     daily AS (
       SELECT s.user_id,
              date_trunc('day', (s.started_at AT TIME ZONE u.timezone))::date AS d,
              SUM(s.duration_minutes) AS minutes
         FROM sessions s JOIN per_user u ON u.user_id = s.user_id
        WHERE s.is_baseline = false AND s.is_active = false
          AND s.started_at >= NOW() - INTERVAL '14 days'
        GROUP BY 1, 2
     )
     SELECT pu.user_id,
            COALESCE((SELECT SUM(d.minutes) FROM daily d
                       WHERE d.user_id = pu.user_id
                         AND d.d > NOW()::date - 7), 0)::text AS daily_avg_minutes_7d,
            (SELECT COUNT(*) FROM sessions s
               WHERE s.user_id = pu.user_id AND s.is_baseline = false
                 AND s.is_active = false
                 AND s.started_at >= NOW() - INTERVAL '28 days'
                 AND EXTRACT(DOW FROM (s.started_at AT TIME ZONE pu.timezone)) IN (0, 6)
            )::text AS weekend_sessions_4w,
            -- naive: days with >= 9h of logged real time in last 14 days.
            (SELECT COUNT(*) FROM daily d
               WHERE d.user_id = pu.user_id AND d.minutes >= 9*60
            )::text AS consecutive_long_days,
            (SELECT COUNT(*) FROM sessions s
               WHERE s.user_id = pu.user_id AND s.is_baseline = false
                 AND s.is_active = false
                 AND s.started_at >= NOW() - INTERVAL '14 days'
                 AND s.feedback = 'difficult'
            )::text AS difficult_count,
            (SELECT COUNT(*) FROM sessions s
               WHERE s.user_id = pu.user_id AND s.is_baseline = false
                 AND s.is_active = false
                 AND s.started_at >= NOW() - INTERVAL '14 days'
                 AND s.feedback IS NOT NULL
            )::text AS feedback_total
       FROM per_user pu`
  );

  const members = users.map((u) => {
    const entry = memberMap.get(u.id)!;
    const bRow = burnRows.find((b) => b.user_id === u.id);
    const dailyAvgMin = Number(bRow?.daily_avg_minutes_7d ?? 0) / 7;
    const feedbackTotal = Number(bRow?.feedback_total ?? 0);
    const difficultRatio =
      feedbackTotal > 0 ? Number(bRow?.difficult_count ?? 0) / feedbackTotal : 0;
    const burnout = {
      daily_avg_hours_7d: dailyAvgMin / 60,
      consecutive_long_days: Number(bRow?.consecutive_long_days ?? 0),
      weekend_sessions_4w: Number(bRow?.weekend_sessions_4w ?? 0),
      after_hours_sessions_4w: 0,
      difficult_session_ratio_2w: difficultRatio,
    };
    const burnoutStat = burnoutStatus(burnout);

    const sent = sentimentByUser.get(u.id);
    const feedback_sentiment:
      | "positive"
      | "neutral"
      | "negative"
      | "insufficient_data" = !sent || sent.total < 3
      ? "insufficient_data"
      : sent.difficult / sent.total > 0.5
        ? "negative"
        : sent.flowed / sent.total > 0.5
          ? "positive"
          : "neutral";

    return {
      user_id: u.id,
      name: u.name,
      this_week_minutes: entry.this_week_minutes,
      utilization_pct: Math.round((entry.this_week_minutes / (48 * 60)) * 100),
      burnout_status: burnoutStat,
      ai_leverage_ratio: aiLeverage(entry.by_work_type),
      feedback_sentiment,
    };
  });

  // Team-wide hire signal.
  const aggregatedTrend = users.map((u) => {
    const entry = memberMap.get(u.id)!;
    return entry.weekly;
  });
  // Aggregate team minutes per week.
  const weekMap = new Map<string, number>();
  for (const weeks of aggregatedTrend) {
    for (const w of weeks) {
      weekMap.set(w.week_start, (weekMap.get(w.week_start) ?? 0) + w.total_minutes);
    }
  }
  const teamWeekly: WeeklyHours[] = [...weekMap.entries()]
    .map(([week_start, total_minutes]) => ({
      week_start,
      total_minutes: total_minutes / Math.max(users.length, 1),
      is_baseline: false,
      by_work_type: {},
    }))
    .sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  const weeksOver85 = consecutiveWeeksOver85(teamWeekly);
  const burnoutCount = members.filter(
    (m) => m.burnout_status !== "green"
  ).length;
  const hire_signal = {
    utilization_weeks_over_85: weeksOver85,
    burnout_amber_or_red_count: burnoutCount,
    status: hireSignalStatus(weeksOver85, burnoutCount),
  };

  const team_avg_hours_this_week =
    users.length === 0
      ? 0
      : members.reduce((s, m) => s + m.this_week_minutes, 0) / users.length / 60;

  // Capacity trend in the response shape the plan describes.
  const weekStarts = [...new Set(trend.map((r) => r.week_start))].sort();
  const capacity_trend = weekStarts.map((w) => ({
    week_start: w,
    members: users.map((u) => {
      const entry = memberMap.get(u.id)!;
      const wk = entry.weekly.find((x) => x.week_start === w);
      return {
        user_id: u.id,
        name: u.name,
        total_minutes: wk?.total_minutes ?? 0,
        is_baseline: wk?.is_baseline ?? false,
      };
    }),
  }));

  if (process.env.NODE_ENV !== "production") {
    console.log(`[analytics/team] ${Date.now() - t0}ms`);
  }

  return NextResponse.json({
    members,
    team_avg_hours_this_week: Math.round(team_avg_hours_this_week * 10) / 10,
    hire_signal,
    capacity_trend,
  });
}
