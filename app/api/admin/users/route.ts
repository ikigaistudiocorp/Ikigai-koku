import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-session";
import { query } from "@/lib/db";
import type { UserRole } from "@/types";

type Body = {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
};

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (current.kokuUser.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const { email, name, password, role } = body;

  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!["owner", "developer", "project_lead"].includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  // Create the auth user via Better Auth (the post-create hook inserts koku_users).
  const result = await auth.api.signUpEmail({
    body: { email, name, password },
    returnHeaders: false,
    asResponse: false,
  });

  // Override the role set by the post-create hook (first-user rule doesn't apply
  // to admin-created invites — the owner explicitly picks the role).
  await query(`UPDATE koku_users SET role = $1 WHERE id = $2`, [
    role,
    result.user.id,
  ]);

  return NextResponse.json({ id: result.user.id, email, name, role }, { status: 201 });
}
