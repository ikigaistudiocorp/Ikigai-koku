import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { query } from "@/lib/db";

// Minimal GET for the clock picker. Full CRUD lands in Phase 2.3.
export async function GET() {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const isOwner = current.kokuUser.role === "owner";
  const { rows } = await query(
    `SELECT p.id, p.name, p.client_name, p.status, p.billable,
            p.hourly_rate::text AS hourly_rate,
            p.created_by, p.created_at
       FROM projects p
      WHERE p.status != 'archived'
        AND ($2 = true
             OR EXISTS (
               SELECT 1 FROM project_members m
                WHERE m.project_id = p.id AND m.user_id = $1
             ))
      ORDER BY p.name ASC`,
    [current.user.id, isOwner]
  );

  // Recent projects (last 10 started sessions for this user).
  const { rows: recent } = await query<{ project_id: string }>(
    `SELECT DISTINCT ON (project_id) project_id
       FROM sessions
      WHERE user_id = $1 AND is_baseline = false
      ORDER BY project_id, started_at DESC`,
    [current.user.id]
  );

  return NextResponse.json({
    projects: rows,
    recent_project_ids: recent.map((r) => r.project_id),
  });
}
