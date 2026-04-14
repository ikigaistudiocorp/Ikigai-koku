import { NextResponse } from "next/server";
import { requireOwner, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { WORK_TYPE_META, type WorkType } from "@/types";

export async function GET(req: Request) {
  const current = await requireOwner();
  if (current instanceof Response) return current;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const projectId = url.searchParams.get("project_id");
  const userId = url.searchParams.get("user_id");
  const format = url.searchParams.get("format") ?? "json";

  if (!from || !to) return jsonError("missing_range", 400);

  const conds: string[] = [
    "s.is_active = false",
    "s.is_baseline = false",
    "p.billable = true",
    "s.ended_at IS NOT NULL",
    "s.started_at >= $1",
    "s.started_at <= $2",
  ];
  const params: unknown[] = [from, to];
  if (projectId) {
    params.push(projectId);
    conds.push(`s.project_id = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    conds.push(`s.user_id = $${params.length}`);
  }

  const { rows } = await query<{
    session_id: string;
    user_name: string;
    project_name: string;
    client_name: string | null;
    work_type: string;
    custom_work_type_name: string | null;
    started_at: string;
    ended_at: string;
    duration_minutes: number;
    hourly_rate: string | null;
    note: string | null;
    feedback: string | null;
  }>(
    `SELECT s.id AS session_id, u.name AS user_name,
            p.name AS project_name, p.client_name,
            s.work_type, c.name AS custom_work_type_name,
            to_char(s.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
            to_char(s.ended_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ended_at,
            s.duration_minutes,
            p.hourly_rate::text AS hourly_rate, s.note, s.feedback
       FROM sessions s
       --
       JOIN projects p ON p.id = s.project_id
       JOIN "user" u ON u.id = s.user_id
       LEFT JOIN custom_work_types c ON c.id = s.custom_work_type_id
      WHERE ${conds.join(" AND ")}
      ORDER BY s.started_at`,
    params
  );

  const sessions = rows.map((r) => {
    const hours = Math.round((r.duration_minutes / 60) * 100) / 100;
    const rate = r.hourly_rate ? Number(r.hourly_rate) : 0;
    const lineTotal = Math.round(hours * rate * 100) / 100;
    const meta = WORK_TYPE_META[r.work_type as WorkType];
    return {
      session_id: r.session_id,
      user_name: r.user_name,
      project_name: r.project_name,
      client_name: r.client_name,
      work_type: r.work_type,
      work_type_label: meta?.label_en ?? r.work_type,
      custom_work_type_name: r.custom_work_type_name,
      date: r.started_at.slice(0, 10),
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_hours: hours,
      hourly_rate: rate,
      line_total: lineTotal,
      note: r.note,
      feedback: r.feedback,
    };
  });

  const summary = {
    total_hours:
      Math.round(sessions.reduce((s, r) => s + r.duration_hours, 0) * 100) /
      100,
    total_billable_value:
      Math.round(sessions.reduce((s, r) => s + r.line_total, 0) * 100) / 100,
    by_project: (() => {
      const m = new Map<string, { project_name: string; client_name: string | null; hours: number; value: number }>();
      for (const r of sessions) {
        const key = r.project_name;
        const entry = m.get(key) ?? {
          project_name: r.project_name,
          client_name: r.client_name,
          hours: 0,
          value: 0,
        };
        entry.hours = Math.round((entry.hours + r.duration_hours) * 100) / 100;
        entry.value = Math.round((entry.value + r.line_total) * 100) / 100;
        m.set(key, entry);
      }
      return [...m.values()];
    })(),
  };

  const payload = {
    export_period: { from, to },
    generated_at: new Date().toISOString(),
    sessions,
    summary,
  };

  if (format === "csv") {
    const header = [
      "Date",
      "Developer",
      "Project",
      "Client",
      "Work Type",
      "Hours",
      "Rate (USD/hr)",
      "Total (USD)",
    ].join(",");
    const lines = sessions.map((s) =>
      [
        s.date,
        csv(s.user_name),
        csv(s.project_name),
        csv(s.client_name ?? ""),
        csv(s.custom_work_type_name ?? s.work_type_label),
        s.duration_hours.toFixed(2),
        s.hourly_rate.toFixed(2),
        s.line_total.toFixed(2),
      ].join(",")
    );
    const body = [header, ...lines].join("\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kinko-${from}-to-${to}.csv"`,
      },
    });
  }

  return NextResponse.json(payload);
}

function csv(value: string): string {
  if (/[,"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
