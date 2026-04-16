"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function format(totalMs: number): string {
  const total = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function Timer({
  startedAt,
  pausedAt,
  pausedIntervals,
  className,
}: {
  startedAt: string | Date;
  pausedAt?: string | null;
  pausedIntervals?: Array<{ start: string; end: string }>;
  className?: string;
}) {
  const start =
    typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const [now, setNow] = useState(() => Date.now());
  const frozen = !!pausedAt;

  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [frozen]);

  const closedPausedMs = (pausedIntervals ?? []).reduce((acc, iv) => {
    const s = new Date(iv.start).getTime();
    const e = new Date(iv.end).getTime();
    return Number.isFinite(s) && Number.isFinite(e) && e > s ? acc + (e - s) : acc;
  }, 0);
  const referenceMs = frozen
    ? new Date(pausedAt!).getTime()
    : now;
  const elapsed = Math.max(0, referenceMs - start.getTime() - closedPausedMs);

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {format(elapsed)}
    </span>
  );
}
