import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireOwner, jsonError } from "@/lib/api";
import { pool, query } from "@/lib/db";
import type { UserRole } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  // Prevent an owner from demoting themselves if they're the last owner.
  if (body.role && body.role !== "owner" && id === current.user.id) {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM koku_users WHERE role = 'owner'`
    );
    if (Number(rows[0]?.count ?? 0) <= 1) {
      return jsonError("last_owner_cannot_demote", 409);
    }
  }

  if (body.role && !["owner", "developer", "project_lead"].includes(body.role)) {
    return jsonError("invalid_role", 400);
  }
  if (body.password !== undefined && body.password.length < 8) {
    return jsonError("weak_password", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (body.name !== undefined || body.email !== undefined) {
      const updates: string[] = [];
      const params: unknown[] = [];
      const push = (v: unknown) => {
        params.push(v);
        return `$${params.length}`;
      };
      if (body.name !== undefined)
        updates.push(`"name" = ${push(body.name.trim())}`);
      if (body.email !== undefined)
        updates.push(`"email" = ${push(body.email.trim().toLowerCase())}`);
      updates.push(`"updatedAt" = NOW()`);
      params.push(id);
      await client.query(
        `UPDATE "user" SET ${updates.join(", ")} WHERE id = $${params.length}`,
        params
      );
    }

    if (body.role !== undefined) {
      await client.query(`UPDATE koku_users SET role = $1 WHERE id = $2`, [
        body.role,
        id,
      ]);
    }

    if (body.password !== undefined) {
      // Use Better Auth's internal password hasher so the stored hash is
      // compatible with signIn.email.
      type AuthCtx = { password: { hash: (p: string) => Promise<string> } };
      const ctx = (await (auth.$context as Promise<AuthCtx>)) as AuthCtx;
      const hash = await ctx.password.hash(body.password);
      await client.query(
        `UPDATE account SET password = $1, "updatedAt" = NOW()
          WHERE "userId" = $2 AND "providerId" = 'credential'`,
        [hash, id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[admin/users PATCH]", err);
    if (isUniqueViolation(err)) return jsonError("email_taken", 409);
    return jsonError("server_error", 500);
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const current = await requireOwner();
  if (current instanceof Response) return current;
  const { id } = await ctx.params;

  if (id === current.user.id) {
    return jsonError("cannot_delete_self", 409);
  }

  // Don't delete the last owner.
  const { rows } = await query<{ role: string; owner_count: string }>(
    `SELECT k.role,
            (SELECT COUNT(*)::text FROM koku_users WHERE role='owner') AS owner_count
       FROM koku_users k WHERE k.id = $1`,
    [id]
  );
  const target = rows[0];
  if (!target) return jsonError("not_found", 404);
  if (target.role === "owner" && Number(target.owner_count) <= 1) {
    return jsonError("last_owner", 409);
  }

  // Deleting the Better Auth "user" row cascades to account/session
  // (Better Auth schema) and to koku_users (ON DELETE CASCADE) which in
  // turn cascades to sessions, project_members, push_subscriptions,
  // weekly_mirrors, friday_context, notification_log.
  await query(`DELETE FROM "user" WHERE id = $1`, [id]);

  return NextResponse.json({ ok: true });
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}
