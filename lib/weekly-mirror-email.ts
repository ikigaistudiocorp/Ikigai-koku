import { Resend } from "resend";
import { query } from "./db";
import { generateWeeklyMirror, gatherMirrorData } from "./weekly-mirror";
import { mondayOfWeekInTz } from "./notifications";

export async function sendWeeklyMirror(userId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return { skipped: "no_resend_key" as const };
  }

  const { rows: userRows } = await query<{
    email: string;
    name: string;
    timezone: string;
    preferred_language: "es" | "en";
    weekly_mirror_enabled: boolean;
  }>(
    `SELECT u.email, u.name, k.timezone, k.preferred_language, k.weekly_mirror_enabled
       FROM koku_users k JOIN "user" u ON u.id = k.id
      WHERE k.id = $1`,
    [userId]
  );
  const u = userRows[0];
  if (!u) return { skipped: "no_user" as const };
  if (!u.weekly_mirror_enabled) return { skipped: "disabled" as const };

  // Monday guard in user timezone.
  const weekdayLocal = new Date()
    .toLocaleString("en-US", { timeZone: u.timezone, weekday: "short" })
    .toLowerCase();
  if (weekdayLocal !== "mon") return { skipped: "not_monday" as const };

  const lastWeekStart = mondayOfWeekInTz(
    new Date(Date.now() - 7 * 24 * 60 * 60_000),
    u.timezone
  );

  // Idempotency.
  const existing = await query<{ id: string }>(
    `SELECT id FROM weekly_mirrors WHERE user_id = $1 AND week_start = $2`,
    [userId, lastWeekStart]
  );
  if (existing.rows[0]) return { skipped: "already_sent" as const };

  const data = await gatherMirrorData({ userId });
  const mirror = await generateWeeklyMirror({ userId });

  const subject =
    u.preferred_language === "en"
      ? `Your week in Koku — ${data.weekStart}`
      : `Tu semana en Koku — ${data.weekStart}`;

  const totalH = (data.totalMinutes / 60).toFixed(1);
  const statsLine =
    u.preferred_language === "en"
      ? `Total: ${totalH}h · DEBUG: ${data.leverage.debug_pct}% · 😤${data.feedback.difficult} 😌${data.feedback.flowed} 🧱${data.feedback.blocked} · Weekend: ${data.burnout.weekend_sessions_4w}`
      : `Total: ${totalH}h · DEBUG: ${data.leverage.debug_pct}% · 😤${data.feedback.difficult} 😌${data.feedback.flowed} 🧱${data.feedback.blocked} · Fin de semana: ${data.burnout.weekend_sessions_4w}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#F7F7F5;border-top:3px solid #574683;padding:24px;border-radius:4px;">
    <div style="font-family:Georgia,serif;font-size:28px;color:#574683;margin:0 0 4px 0;">Koku 刻</div>
    <div style="font-family:Courier,monospace;font-size:12px;color:#555;margin-bottom:20px;">${data.weekStart}</div>
    <div style="font-size:16px;line-height:1.6;color:#1A1A1A;white-space:pre-wrap;">${escapeHtml(mirror)}</div>
    <div style="font-family:Courier,monospace;font-size:12px;color:#555;margin-top:24px;border-top:1px solid #ddd;padding-top:12px;">${statsLine}</div>
    <div style="font-size:12px;color:#888;margin-top:20px;">
      Koku by Ikigai Studio · ikigaistudio.ai ·
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/settings" style="color:#574683;">
        ${u.preferred_language === "en" ? "Disable weekly mirror" : "Desactivar espejo semanal"}
      </a>
    </div>
  </div>
</body></html>`;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Koku <koku@ikigaistudio.ai>",
    to: u.email,
    subject,
    html,
  });

  await query(
    `INSERT INTO weekly_mirrors (user_id, week_start, content, friday_context_used, delivered_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, week_start) DO NOTHING`,
    [userId, lastWeekStart, mirror, data.fridayContext]
  );

  return { sent: true, week_start: lastWeekStart };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
