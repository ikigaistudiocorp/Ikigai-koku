import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { query } from "@/lib/db";
import { aiLeverage } from "@/lib/analytics";

/**
 * For each session-feedback bucket, aggregate the AI-cycle minutes the
 * caller logged and compute the resulting AI Leverage Ratio. The UI
 * reads this to show, e.g., "difficult sessions had a 42% DEBUG share
 * vs 18% on flowed sessions" — a correlation, not a causation.
 */
export async function GET(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id") ?? current.user.id;
  if (userId !== current.user.id && current.kokuUser.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { rows } = await query<{
    feedback: string | null;
    work_type: string;
    minutes: string;
    session_count: string;
  }>(
    `SELECT s.feedback, s.work_type,
            SUM(s.duration_minutes)::text AS minutes,
            COUNT(*)::text AS session_count
       FROM sessions s
      WHERE s.user_id = $1 AND s.is_baseline = false AND s.is_active = false
      GROUP BY s.feedback, s.work_type`,
    [userId]
  );

  const buckets: Record<
    "difficult" | "flowed" | "blocked",
    { by_work_type: Record<string, number>; session_count: number }
  > = {
    difficult: { by_work_type: {}, session_count: 0 },
    flowed: { by_work_type: {}, session_count: 0 },
    blocked: { by_work_type: {}, session_count: 0 },
  };

  for (const r of rows) {
    if (r.feedback === "difficult" || r.feedback === "flowed" || r.feedback === "blocked") {
      const b = buckets[r.feedback];
      b.by_work_type[r.work_type] = Number(r.minutes);
      b.session_count += Number(r.session_count);
    }
  }

  return NextResponse.json({
    difficult: {
      session_count: buckets.difficult.session_count,
      leverage: aiLeverage(buckets.difficult.by_work_type),
    },
    flowed: {
      session_count: buckets.flowed.session_count,
      leverage: aiLeverage(buckets.flowed.by_work_type),
    },
    blocked: {
      session_count: buckets.blocked.session_count,
      leverage: aiLeverage(buckets.blocked.by_work_type),
    },
  });
}
