import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { isWorkType } from "@/lib/sessions";

export async function GET(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;

  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("user_id");
  const projectId = url.searchParams.get("project_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const workType = url.searchParams.get("work_type");
  const includeBaseline = url.searchParams.get("include_baseline") === "true";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  const isOwner = current.kokuUser.role === "owner";
  if (queryUserId && queryUserId !== current.user.id && !isOwner) {
    return jsonError("forbidden", 403);
  }
  if (workType && !isWorkType(workType)) {
    return jsonError("invalid_work_type", 400);
  }

  const conds: string[] = ["s.is_active = false"];
  const params: unknown[] = [];
  const push = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  conds.push(`s.user_id = ${push(queryUserId ?? current.user.id)}`);
  if (projectId) conds.push(`s.project_id = ${push(projectId)}`);
  if (workType) conds.push(`s.work_type = ${push(workType)}`);
  if (from) conds.push(`s.started_at >= ${push(from)}`);
  if (to) conds.push(`s.started_at <= ${push(to)}`);
  if (!includeBaseline) conds.push(`s.is_baseline = false`);

  const where = `WHERE ${conds.join(" AND ")}`;

  const sql = `
    SELECT s.id, s.user_id, s.project_id, s.work_type, s.custom_work_type_id,
           s.started_at, s.ended_at, s.duration_minutes, s.note, s.feedback,
           s.is_baseline,
           p.name AS project_name, p.client_name,
           c.name AS custom_work_type_name, c.color AS custom_work_type_color,
           u.name AS user_name
      FROM sessions s
      JOIN projects p ON p.id = s.project_id
      JOIN "user" u ON u.id = s.user_id
      LEFT JOIN custom_work_types c ON c.id = s.custom_work_type_id
      ${where}
     ORDER BY s.started_at DESC
     LIMIT ${push(limit)} OFFSET ${push(offset)}
  `;

  const { rows } = await query(sql, params);

  // Total count for paging — same filters, no LIMIT.
  const countParams = params.slice(0, params.length - 2);
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sessions s ${where.replace(/LIMIT.*$/, "")}`,
    countParams
  );

  return NextResponse.json({
    sessions: rows,
    total: Number(countRows[0]?.count ?? 0),
    limit,
    offset,
  });
}
