import { NextResponse } from "next/server";
import {
  checkForgottenClockOuts,
  checkSmartHeartbeat,
  checkDailyHours,
  checkDailyReminder,
  checkFridayContextTag,
} from "@/lib/notifications";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const out: Record<string, { ms: number; results: unknown }> = {};

  const tasks = [
    ["forgotten_clockouts", checkForgottenClockOuts],
    ["smart_heartbeat", checkSmartHeartbeat],
    ["daily_hours", checkDailyHours],
    ["daily_reminder", checkDailyReminder],
    ["friday_context", checkFridayContextTag],
  ] as const;

  for (const [label, fn] of tasks) {
    const t0 = Date.now();
    try {
      const results = await fn(now);
      out[label] = { ms: Date.now() - t0, results };
    } catch (err) {
      console.error(`[cron] ${label} failed:`, err);
      out[label] = { ms: Date.now() - t0, results: { error: String(err) } };
    }
  }

  return NextResponse.json({ ran_at: now.toISOString(), tasks: out });
}
