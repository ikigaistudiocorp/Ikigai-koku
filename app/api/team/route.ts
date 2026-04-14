import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { query } from "@/lib/db";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>(
    `SELECT u.id, u.email, u.name, k.role
       FROM koku_users k
       JOIN "user" u ON u.id = k.id
      ORDER BY k.created_at ASC`
  );

  return NextResponse.json({ members: rows });
}
