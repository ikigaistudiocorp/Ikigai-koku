import { query } from "./db";
import { sendPush, lastSentAt } from "./push";

// Helpers ─────────────────────────────────────────────────────────────────

function hoursMinutes(minutes: number): { h: number; m: number } {
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

function minutesBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 60_000);
}

function isSameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

type UserRow = {
  id: string;
  timezone: string;
  preferred_language: "es" | "en";
};

// 1. Forgotten clock-out ──────────────────────────────────────────────────
export async function checkForgottenClockOuts(now = new Date()) {
  const { rows } = await query<{
    session_id: string;
    user_id: string;
    project_name: string;
    started_at: string;
    minutes: number;
    preferred_language: "es" | "en";
  }>(
    `SELECT s.id AS session_id, s.user_id, p.name AS project_name,
            s.started_at,
            EXTRACT(EPOCH FROM (NOW() - s.started_at))::int / 60 AS minutes,
            k.preferred_language
       FROM sessions s
       JOIN projects p ON p.id = s.project_id
       JOIN koku_users k ON k.id = s.user_id
      WHERE s.is_active = true
        AND s.paused_at IS NULL
        AND s.started_at < NOW() - INTERVAL '3 hours'`
  );

  const results: { user_id: string; sent: boolean }[] = [];
  for (const r of rows) {
    const last = await lastSentAt(r.user_id, "forgotten-clockout");
    if (last && minutesBetween(now, last) < 120) {
      results.push({ user_id: r.user_id, sent: false });
      continue;
    }
    const { h, m } = hoursMinutes(Number(r.minutes));
    const title =
      r.preferred_language === "en" ? "⏱ Still working?" : "⏱ ¿Sigues trabajando?";
    const body =
      r.preferred_language === "en"
        ? `You've been clocked in for ${h}h ${m}m on ${r.project_name}. Forgot to clock out?`
        : `Llevas ${h}h ${m}m en ${r.project_name}. ¿Olvidaste registrar la salida?`;
    await sendPush(r.user_id, {
      title,
      body,
      url: "/clock",
      tag: "forgotten-clockout",
    });
    results.push({ user_id: r.user_id, sent: true });
  }
  return results;
}

// 2. Smart heartbeat ──────────────────────────────────────────────────────
export async function checkSmartHeartbeat(now = new Date()) {
  const { rows } = await query<{
    session_id: string;
    user_id: string;
    project_name: string;
    work_type: string;
    custom_name: string | null;
    started_at: string;
    minutes: number;
    preferred_language: "es" | "en";
  }>(
    `SELECT s.id AS session_id, s.user_id, p.name AS project_name,
            s.work_type, c.name AS custom_name,
            s.started_at,
            EXTRACT(EPOCH FROM (NOW() - s.started_at))::int / 60 AS minutes,
            k.preferred_language
       FROM sessions s
       JOIN projects p ON p.id = s.project_id
       JOIN koku_users k ON k.id = s.user_id
       LEFT JOIN custom_work_types c ON c.id = s.custom_work_type_id
      WHERE s.is_active = true`
  );

  const results: { user_id: string; sent: boolean }[] = [];
  for (const r of rows) {
    const minutes = Number(r.minutes);
    if (minutes < 60) {
      results.push({ user_id: r.user_id, sent: false });
      continue;
    }
    // Under 2 hours: one push at 60-minute mark. Over 2h: every 60 minutes.
    const last = await lastSentAt(r.user_id, "session-heartbeat");
    if (last && minutesBetween(now, last) < 60) {
      results.push({ user_id: r.user_id, sent: false });
      continue;
    }
    const { h, m } = hoursMinutes(minutes);
    const workLabel = r.custom_name ?? r.work_type;
    const title = `⏱ Koku — ${r.project_name}`;
    const body =
      r.preferred_language === "en"
        ? `You've been working ${h}h ${m}m on ${workLabel}`
        : `Llevas ${h}h ${m}m en ${workLabel}`;
    await sendPush(r.user_id, {
      title,
      body,
      url: "/clock",
      tag: "session-heartbeat",
    });
    results.push({ user_id: r.user_id, sent: true });
  }
  return results;
}

// 3. Daily long-day threshold ─────────────────────────────────────────────
export async function checkDailyHours(now = new Date()) {
  const { rows } = await query<{
    user_id: string;
    minutes: number;
    preferred_language: "es" | "en";
  }>(
    `SELECT k.id AS user_id,
            COALESCE(SUM(s.duration_minutes), 0) AS minutes,
            k.preferred_language
       FROM koku_users k
       LEFT JOIN sessions s
         ON s.user_id = k.id
        AND s.is_baseline = false
        AND s.is_active = false
        AND s.started_at >= date_trunc('day', NOW() AT TIME ZONE k.timezone)
                              AT TIME ZONE k.timezone
      GROUP BY k.id, k.preferred_language`
  );

  const results: { user_id: string; sent: boolean }[] = [];
  for (const r of rows) {
    if (Number(r.minutes) < 7 * 60) {
      results.push({ user_id: r.user_id, sent: false });
      continue;
    }
    const last = await lastSentAt(r.user_id, "daily-threshold");
    if (last && isSameUtcDay(now, last)) {
      results.push({ user_id: r.user_id, sent: false });
      continue;
    }
    const hours = Math.floor(Number(r.minutes) / 60);
    const title =
      r.preferred_language === "en"
        ? "⚠️ Koku — Long day"
        : "⚠️ Koku — Jornada larga";
    const body =
      r.preferred_language === "en"
        ? `You've logged ${hours}h today. Consider a break.`
        : `Llevas ${hours}h hoy. Considera hacer una pausa.`;
    await sendPush(r.user_id, {
      title,
      body,
      url: "/clock",
      tag: "daily-threshold",
    });
    results.push({ user_id: r.user_id, sent: true });
  }
  return results;
}

// 4. Daily reminder for users who logged nothing yet ──────────────────────
export async function checkDailyReminder(now = new Date()) {
  const { rows } = await query<
    UserRow & { session_count: number }
  >(
    `SELECT k.id, k.timezone, k.preferred_language,
            COUNT(s.id)::int AS session_count
       FROM koku_users k
       LEFT JOIN sessions s
         ON s.user_id = k.id
        AND s.is_baseline = false
        AND s.is_active = false
        AND s.started_at >= date_trunc('day', NOW() AT TIME ZONE k.timezone)
                              AT TIME ZONE k.timezone
      GROUP BY k.id, k.timezone, k.preferred_language`
  );

  const results: { user_id: string; sent: boolean }[] = [];
  for (const r of rows) {
    if (r.session_count > 0) {
      results.push({ user_id: r.id, sent: false });
      continue;
    }
    const last = await lastSentAt(r.id, "daily-reminder");
    if (last && isSameUtcDay(now, last)) {
      results.push({ user_id: r.id, sent: false });
      continue;
    }
    const title = "📋 Koku";
    const body =
      r.preferred_language === "en"
        ? "No activity logged today. Ready to start?"
        : "No has registrado actividad hoy. ¿Empezamos?";
    await sendPush(r.id, {
      title,
      body,
      url: "/clock",
      tag: "daily-reminder",
    });
    results.push({ user_id: r.id, sent: true });
  }
  return results;
}

// 5. Friday context tag ───────────────────────────────────────────────────
export async function checkFridayContextTag(now = new Date()) {
  const { rows } = await query<UserRow>(
    `SELECT id, timezone, preferred_language FROM koku_users`
  );

  const results: { user_id: string; sent: boolean }[] = [];
  for (const r of rows) {
    // Skip anyone whose local day is not Friday. Instead of shelling out to
    // Intl.DateTimeFormat we compute the weekday in their timezone via
    // `toLocaleString` and an explicit timeZone option.
    const localDay = Number(
      now.toLocaleString("en-US", { timeZone: r.timezone, weekday: "short" })
        .toLowerCase() === "fri"
    );
    if (!localDay) {
      results.push({ user_id: r.id, sent: false });
      continue;
    }
    // Only send after 16:00 local time.
    const localHour = Number(
      now.toLocaleString("en-US", {
        timeZone: r.timezone,
        hour: "numeric",
        hour12: false,
      })
    );
    if (localHour < 16) {
      results.push({ user_id: r.id, sent: false });
      continue;
    }

    // Already has a context row for this week or already sent today?
    const weekStart = mondayOfWeekInTz(now, r.timezone);
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM friday_context
        WHERE user_id = $1 AND week_start = $2 LIMIT 1`,
      [r.id, weekStart]
    );
    if (existing[0]) {
      results.push({ user_id: r.id, sent: false });
      continue;
    }
    const last = await lastSentAt(r.id, "friday-context");
    if (last && isSameUtcDay(now, last)) {
      results.push({ user_id: r.id, sent: false });
      continue;
    }

    const title =
      r.preferred_language === "en"
        ? "📝 Koku — Weekly Mirror"
        : "📝 Koku — Espejo semanal";
    const body =
      r.preferred_language === "en"
        ? "Anything I should know about your week before writing Monday's mirror?"
        : "¿Algo que debería saber sobre tu semana antes de escribir tu espejo del lunes?";
    await sendPush(r.id, {
      title,
      body,
      url: "/friday-context",
      tag: "friday-context",
    });
    results.push({ user_id: r.id, sent: true });
  }
  return results;
}

export function mondayOfWeekInTz(now: Date, timezone: string): string {
  // Return YYYY-MM-DD (Monday) for the caller's timezone.
  const dayName = now
    .toLocaleString("en-US", { timeZone: timezone, weekday: "short" })
    .toLowerCase();
  const weekdayIdx = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(
    dayName
  );
  const offsetFromMonday = (weekdayIdx + 6) % 7;
  const local = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  local.setDate(local.getDate() - offsetFromMonday);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
