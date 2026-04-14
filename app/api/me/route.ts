import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json(current);
}
