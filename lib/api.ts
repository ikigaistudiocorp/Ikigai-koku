import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "./auth-session";

export function jsonError(code: string, status: number, extra?: object) {
  return NextResponse.json({ error: code, ...(extra ?? {}) }, { status });
}

export async function requireAuth(): Promise<CurrentUser | Response> {
  const current = await getCurrentUser();
  if (!current) return jsonError("unauthorized", 401);
  return current;
}

export async function requireOwner(): Promise<CurrentUser | Response> {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  if (current.kokuUser.role !== "owner") return jsonError("forbidden", 403);
  return current;
}
