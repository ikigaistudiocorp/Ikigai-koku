"use client";

import { useQuery } from "@tanstack/react-query";
import type { CurrentUser } from "@/lib/auth-session";

async function fetchMe(): Promise<CurrentUser | null> {
  const res = await fetch("/api/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /api/me failed: ${res.status}`);
  return (await res.json()) as CurrentUser;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });
}
