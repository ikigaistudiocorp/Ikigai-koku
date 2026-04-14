"use client";

import { useQuery } from "@tanstack/react-query";
import type { Project, CustomWorkType } from "@/types";

export function useProjects() {
  return useQuery<{ projects: Project[]; recent_project_ids: string[] }>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error(`projects ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useCustomWorkTypes(projectId: string | null) {
  return useQuery<{ custom_work_types: CustomWorkType[] }>({
    queryKey: ["work-types", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res = await fetch(
        `/api/work-types?project_id=${projectId ?? ""}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`work-types ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });
}
