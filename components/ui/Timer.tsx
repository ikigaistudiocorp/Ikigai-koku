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
  className,
}: {
  startedAt: string | Date;
  className?: string;
}) {
  const start =
    typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {format(now - start.getTime())}
    </span>
  );
}
