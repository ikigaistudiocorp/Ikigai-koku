import { NextResponse } from "next/server";
import { requireAuth, jsonError } from "@/lib/api";
import { query } from "@/lib/db";

type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as SubBody;
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!endpoint || !p256dh || !auth) return jsonError("missing_keys", 400);

  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id,
                                           p256dh = EXCLUDED.p256dh,
                                           auth = EXCLUDED.auth`,
    [current.user.id, endpoint, p256dh, auth]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const current = await requireAuth();
  if (current instanceof Response) return current;
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) return jsonError("missing_endpoint", 400);
  await query(
    `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
    [current.user.id, body.endpoint]
  );
  return NextResponse.json({ ok: true });
}
