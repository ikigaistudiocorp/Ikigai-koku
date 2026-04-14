import Anthropic from "@anthropic-ai/sdk";
import { query } from "./db";
import { burnoutStatus, aiLeverage } from "./analytics";
import { mondayOfWeekInTz } from "./notifications";

type Language = "es" | "en";

export type MirrorInput = {
  userId: string;
  includeCurrentWeek?: boolean; // for preview; defaults to false (last week)
};

export async function gatherMirrorData(input: MirrorInput) {
  const userId = input.userId;

  const { rows: userRows } = await query<{
    name: string;
    timezone: string;
    preferred_language: Language;
    after_hours_start: string;
    after_hours_end: string;
  }>(
    `SELECT u.name, k.timezone, k.preferred_language,
            k.after_hours_start::text AS after_hours_start,
            k.after_hours_end::text AS after_hours_end
       FROM koku_users k JOIN "user" u ON u.id = k.id
      WHERE k.id = $1`,
    [userId]
  );
  const u = userRows[0];
  if (!u) throw new Error("user_not_found");

  const weekStart = input.includeCurrentWeek
    ? mondayOfWeekInTz(new Date(), u.timezone)
    : mondayOfWeekInTz(
        new Date(Date.now() - 7 * 24 * 60 * 60_000),
        u.timezone
      );

  // Sum by work type for the week.
  const { rows: weekRows } = await query<{ work_type: string; minutes: string }>(
    `SELECT s.work_type,
            COALESCE(SUM(s.duration_minutes), 0)::text AS minutes
       FROM sessions s
      WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
        AND s.started_at >= ($2::date) AT TIME ZONE $3
        AND s.started_at <  ($2::date + INTERVAL '7 days') AT TIME ZONE $3
      GROUP BY s.work_type`,
    [userId, weekStart, u.timezone]
  );
  const byWorkType: Record<string, number> = {};
  for (const r of weekRows) byWorkType[r.work_type] = Number(r.minutes);
  const totalMinutes = Object.values(byWorkType).reduce((s, n) => s + n, 0);
  const leverage = aiLeverage(byWorkType);

  // Personal 12-week DEBUG pct baseline.
  const { rows: baseRows } = await query<{ debug_pct: string }>(
    `WITH by_type AS (
       SELECT s.work_type, COALESCE(SUM(s.duration_minutes), 0) AS m
         FROM sessions s
        WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
          AND s.started_at >= NOW() - INTERVAL '12 weeks'
          AND s.work_type IN ('spec', 'build', 'debug', 'polish')
        GROUP BY s.work_type
     )
     SELECT CASE WHEN SUM(m) > 0
                 THEN ROUND((100.0 * SUM(m) FILTER (WHERE work_type='debug')) / SUM(m))
                 ELSE 0
            END::text AS debug_pct
       FROM by_type`,
    [userId]
  );
  const baselineDebug = Number(baseRows[0]?.debug_pct ?? 0);

  // Burnout signals for the window.
  const { rows: burn } = await query<{
    weekend: string;
    long_days: string;
    after_hours: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM sessions s
         WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
           AND s.started_at >= ($2::date) AT TIME ZONE $3
           AND s.started_at <  ($2::date + INTERVAL '7 days') AT TIME ZONE $3
           AND EXTRACT(DOW FROM (s.started_at AT TIME ZONE $3)) IN (0, 6)
       )::text AS weekend,
       (WITH daily AS (
         SELECT date_trunc('day', (s.started_at AT TIME ZONE $3))::date AS d,
                SUM(s.duration_minutes) AS m
           FROM sessions s
          WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
            AND s.started_at >= ($2::date) AT TIME ZONE $3
            AND s.started_at <  ($2::date + INTERVAL '7 days') AT TIME ZONE $3
          GROUP BY 1
       ) SELECT COUNT(*) FROM daily WHERE m >= 9*60)::text AS long_days,
       (SELECT COUNT(*) FROM sessions s, koku_users k
          WHERE s.user_id = $1 AND k.id = $1
            AND s.is_baseline = false AND s.is_active = false
            AND s.started_at >= ($2::date) AT TIME ZONE $3
            AND s.started_at <  ($2::date + INTERVAL '7 days') AT TIME ZONE $3
            AND ((s.started_at AT TIME ZONE $3)::time >= k.after_hours_start
                 OR (s.started_at AT TIME ZONE $3)::time < k.after_hours_end)
       )::text AS after_hours`,
    [userId, weekStart, u.timezone]
  );

  // Feedback counts for the week.
  const { rows: fb } = await query<{ feedback: string | null; count: string }>(
    `SELECT feedback, COUNT(*)::text AS count
       FROM sessions s
      WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
        AND s.started_at >= ($2::date) AT TIME ZONE $3
        AND s.started_at <  ($2::date + INTERVAL '7 days') AT TIME ZONE $3
      GROUP BY feedback`,
    [userId, weekStart, u.timezone]
  );
  const feedback = { difficult: 0, flowed: 0, blocked: 0, none: 0 };
  for (const r of fb) {
    const n = Number(r.count);
    if (r.feedback === "difficult") feedback.difficult = n;
    else if (r.feedback === "flowed") feedback.flowed = n;
    else if (r.feedback === "blocked") feedback.blocked = n;
    else feedback.none = n;
  }

  // Most-time project.
  const { rows: topProj } = await query<{
    name: string;
    minutes: string;
    dominant_type: string | null;
  }>(
    `WITH week_sessions AS (
       SELECT * FROM sessions s
        WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
          AND s.started_at >= ($2::date) AT TIME ZONE $3
          AND s.started_at <  ($2::date + INTERVAL '7 days') AT TIME ZONE $3
     ),
     per_project AS (
       SELECT project_id, SUM(duration_minutes) AS m
         FROM week_sessions GROUP BY project_id
     ),
     top AS (
       SELECT project_id, m FROM per_project ORDER BY m DESC LIMIT 1
     ),
     dominant AS (
       SELECT work_type, SUM(duration_minutes) AS m
         FROM week_sessions WHERE project_id = (SELECT project_id FROM top)
        GROUP BY work_type ORDER BY m DESC LIMIT 1
     )
     SELECT p.name, (SELECT m::text FROM top),
            (SELECT work_type FROM dominant) AS dominant_type
       FROM top
       LEFT JOIN projects p ON p.id = top.project_id`,
    [userId, weekStart, u.timezone]
  );
  const topProject = topProj[0] ?? null;

  // Friday context.
  const { rows: ctx } = await query<{ context: string }>(
    `SELECT context FROM friday_context
      WHERE user_id = $1 AND week_start = $2 LIMIT 1`,
    [userId, weekStart]
  );
  const fridayContext = ctx[0]?.context ?? null;

  return {
    user: u,
    weekStart,
    totalMinutes,
    leverage,
    baselineDebug,
    burnout: {
      daily_avg_hours_7d: totalMinutes / 7 / 60,
      consecutive_long_days: Number(burn[0]?.long_days ?? 0),
      weekend_sessions_4w: Number(burn[0]?.weekend ?? 0),
      after_hours_sessions_4w: Number(burn[0]?.after_hours ?? 0),
      difficult_session_ratio_2w:
        feedback.difficult + feedback.flowed + feedback.blocked > 0
          ? feedback.difficult /
            (feedback.difficult + feedback.flowed + feedback.blocked)
          : 0,
    },
    burnout_status: burnoutStatus({
      daily_avg_hours_7d: totalMinutes / 7 / 60,
      consecutive_long_days: Number(burn[0]?.long_days ?? 0),
      weekend_sessions_4w: Number(burn[0]?.weekend ?? 0),
      after_hours_sessions_4w: Number(burn[0]?.after_hours ?? 0),
      difficult_session_ratio_2w:
        feedback.difficult + feedback.flowed + feedback.blocked > 0
          ? feedback.difficult /
            (feedback.difficult + feedback.flowed + feedback.blocked)
          : 0,
    }),
    feedback,
    topProject,
    fridayContext,
  };
}

export async function generateWeeklyMirror(input: MirrorInput): Promise<string> {
  const d = await gatherMirrorData(input);
  const lang = d.user.preferred_language;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    // Deterministic fallback so preview still works without a real key.
    const hours = (d.totalMinutes / 60).toFixed(1);
    return lang === "en"
      ? `You logged ${hours}h last week. Debug share: ${d.leverage.debug_pct}% (personal baseline ${d.baselineDebug}%). This is a local-fallback mirror; set ANTHROPIC_API_KEY to get the real one.`
      : `Registraste ${hours}h la semana pasada. Proporción de depuración: ${d.leverage.debug_pct}% (tu base personal: ${d.baselineDebug}%). Este es un espejo local; configura ANTHROPIC_API_KEY para ver el real.`;
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt =
    `You are a trusted colleague writing a private weekly reflection for a developer at an AI-native consulting firm in Panama City. ` +
    `You write with warmth and directness — like a peer who respects the person's intelligence and time. ` +
    `You never use corporate language, buzzwords, or generic encouragement. ` +
    `You never use the words "productivity" or "performance". ` +
    `Write entirely in ${lang === "en" ? "English" : "Spanish"}. ` +
    `Maximum 200 words. Structure: ` +
    `1) one honest sentence about the week's hours; ` +
    `2) one specific observation about the AI Leverage Ratio vs the personal baseline — what the change means, not just what it is; ` +
    `3) one observation about work balance — only if genuinely notable, skip if it was a normal week; ` +
    `4) if session feedback data exists, one observation about patterns in how sessions felt; ` +
    `5) one question to sit with — specific, not rhetorical, worth more than 10 seconds of thought. ` +
    `If Friday context was provided, acknowledge it naturally — do not quote it back verbatim. ` +
    `Never be generic. If a point has nothing meaningful to say, omit it.`;

  const userContent =
    `Developer: ${d.user.name}\n` +
    `Week: ${d.weekStart}\n` +
    `Hours: ${(d.totalMinutes / 60).toFixed(1)}h (48h baseline, ` +
    `${d.totalMinutes - 48 * 60 > 0 ? "+" : ""}${((d.totalMinutes - 48 * 60) / 60).toFixed(1)}h vs baseline)\n` +
    `Work breakdown: SPEC ${d.leverage.spec_pct}%, BUILD ${d.leverage.build_pct}%, ` +
    `DEBUG ${d.leverage.debug_pct}%, POLISH ${d.leverage.polish_pct}%\n` +
    `DEBUG vs personal 12-week average: ${d.leverage.debug_pct}% vs ${d.baselineDebug}% ` +
    `(${d.leverage.debug_pct - d.baselineDebug >= 0 ? "+" : ""}${d.leverage.debug_pct - d.baselineDebug} points)\n` +
    `Weekend sessions: ${d.burnout.weekend_sessions_4w}\n` +
    `Consecutive long days: ${d.burnout.consecutive_long_days}\n` +
    `After-hours sessions: ${d.burnout.after_hours_sessions_4w}\n` +
    `Session feedback this week: difficult ${d.feedback.difficult} · flowed ${d.feedback.flowed} · blocked ${d.feedback.blocked} · no-feedback ${d.feedback.none}\n` +
    (d.topProject
      ? `Most time: ${d.topProject.name} (${Math.round(Number(d.topProject.minutes) / 6) / 10}h, ${d.topProject.dominant_type ?? "mixed"})\n`
      : "") +
    (d.fridayContext
      ? `Friday context from developer: "${d.fridayContext}"\n`
      : "") +
    `Write the weekly mirror.`;

  const result = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const text = result.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  return text || "";
}
