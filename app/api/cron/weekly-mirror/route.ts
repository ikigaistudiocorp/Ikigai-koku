import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendWeeklyMirror } from "@/lib/weekly-mirror-email";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  const { rows: users } = await query<{ id: string }>(
    `SELECT id FROM koku_users WHERE weekly_mirror_enabled = true`
  );
  const results: Array<{ user_id: string; result: unknown }> = [];
  for (const u of users) {
    try {
      const r = await sendWeeklyMirror(u.id);
      results.push({ user_id: u.id, result: r });
    } catch (err) {
      console.error("[weekly-mirror]", u.id, err);
      results.push({ user_id: u.id, result: { error: String(err) } });
    }
  }
  return NextResponse.json({ ms: Date.now() - t0, results });
}
