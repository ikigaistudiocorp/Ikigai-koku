"use client";

import Link from "next/link";
import { useActiveSession } from "@/hooks/useActiveSession";
import { Timer } from "@/components/ui/Timer";

export function ActiveTimerBanner() {
  const { data: active } = useActiveSession();
  if (!active) return null;
  return (
    <Link
      href="/clock"
      className="block bg-ikigai-purple text-white px-4 py-2 text-sm flex items-center justify-between"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-2 h-2 rounded-full bg-white animate-pulse"
        />
        <span className="truncate max-w-[60vw]">{active.project.name}</span>
      </span>
      <Timer startedAt={active.started_at} className="text-sm" />
    </Link>
  );
}
