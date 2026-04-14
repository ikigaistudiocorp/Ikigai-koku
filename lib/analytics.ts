import type { WorkType } from "@/types";
import { AI_CYCLE_WORK_TYPES } from "@/types";

export type WeeklyHours = {
  week_start: string; // YYYY-MM-DD
  total_minutes: number;
  is_baseline: boolean;
  by_work_type: Record<string, number>;
};

export type AILeverage = {
  spec_pct: number;
  build_pct: number;
  debug_pct: number;
  polish_pct: number;
  total_ai_minutes: number;
};

export type BurnoutStatus = "green" | "amber" | "red";

export type BurnoutStats = {
  daily_avg_hours_7d: number;
  consecutive_long_days: number;
  weekend_sessions_4w: number;
  after_hours_sessions_4w: number;
  difficult_session_ratio_2w: number;
  status: BurnoutStatus;
};

export type FeedbackSummary = {
  difficult_count: number;
  flowed_count: number;
  blocked_count: number;
  no_feedback_count: number;
};

export function aiLeverage(
  minutesByType: Record<string, number>
): AILeverage {
  const pick = (w: WorkType) => Number(minutesByType[w] ?? 0);
  const total = AI_CYCLE_WORK_TYPES.reduce((s, w) => s + pick(w), 0);
  const pct = (m: number) => (total === 0 ? 0 : Math.round((m / total) * 100));
  return {
    spec_pct: pct(pick("spec")),
    build_pct: pct(pick("build")),
    debug_pct: pct(pick("debug")),
    polish_pct: pct(pick("polish")),
    total_ai_minutes: total,
  };
}

export function burnoutStatus(b: Omit<BurnoutStats, "status">): BurnoutStatus {
  if (
    b.consecutive_long_days >= 5 ||
    b.weekend_sessions_4w >= 6 ||
    b.daily_avg_hours_7d >= 10
  ) {
    return "red";
  }
  if (
    b.consecutive_long_days >= 3 ||
    b.weekend_sessions_4w >= 3 ||
    b.daily_avg_hours_7d >= 9 ||
    b.difficult_session_ratio_2w > 0.6
  ) {
    return "amber";
  }
  return "green";
}

export type HireSignalStatus = "green" | "amber" | "red";

export function hireSignalStatus(
  weeksOver85: number,
  burnoutCount: number
): HireSignalStatus {
  if (weeksOver85 >= 6 && burnoutCount >= 1) return "red";
  if (weeksOver85 >= 4 || burnoutCount >= 1) return "amber";
  return "green";
}

/**
 * Count consecutive weeks ending at the most recent week where
 * total_minutes was ≥ 48*60 * 0.85 (85% of sustainable baseline).
 * The first week not meeting the threshold resets the counter.
 */
export function consecutiveWeeksOver85(weeks: WeeklyHours[]): number {
  const target = 48 * 60 * 0.85;
  // Walk from the most recent week backwards.
  const sorted = [...weeks].sort((a, b) =>
    a.week_start < b.week_start ? 1 : -1
  );
  let count = 0;
  for (const w of sorted) {
    if (w.total_minutes >= target) count++;
    else break;
  }
  return count;
}
