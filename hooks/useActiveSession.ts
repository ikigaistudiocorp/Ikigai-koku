"use client";

import { useQuery } from "@tanstack/react-query";
import type { Session, Project } from "@/types";

export type ActiveSession = Session & {
  project: Pick<Project, "id" | "name" | "client_name">;
};

async function fetchActive(): Promise<ActiveSession | null> {
  const res = await fetch("/api/sessions/active", { credentials: "include" });
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as ActiveSession | null;
  return data;
}

export function useActiveSession() {
  return useQuery({
    queryKey: ["sessions", "active"],
    queryFn: fetchActive,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
