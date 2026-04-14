import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { generateWeeklyMirror } from "@/lib/weekly-mirror";

export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const text = await generateWeeklyMirror({
    userId: current.user.id,
    includeCurrentWeek: true,
  });
  return NextResponse.json({ preview: text });
}
