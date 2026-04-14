"use client";

import { useQuery } from "@tanstack/react-query";

export type TodaySession = {
  id: string;
  work_type: string;
  custom_work_type_name: string | null;
  duration_minutes: number | null;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  feedback: string | null;
  project_name: string;
};

export type TodaySummary = {
  sessions: TodaySession[];
  total_minutes_today: number;
  session_count: number;
  by_work_type: Record<string, number>;
};

async function fetchToday(): Promise<TodaySummary> {
  const res = await fetch("/api/sessions/today", { credentials: "include" });
  if (!res.ok) throw new Error(`today ${res.status}`);
  return res.json();
}

export function useTodaySummary() {
  return useQuery({
    queryKey: ["sessions", "today"],
    queryFn: fetchToday,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
