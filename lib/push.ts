import webpush from "web-push";
import { query } from "./db";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!pub || !priv) {
    throw new Error("VAPID keys missing");
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendPush(userId: string, payload: PushPayload) {
  configure();
  const { rows } = await query<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );

  let sent = 0;
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Endpoint gone — drop it so we don't keep retrying.
        await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
      } else {
        console.error("[push] send failed:", err);
      }
    }
  }

  if (payload.tag && sent > 0) {
    await query(
      `INSERT INTO notification_log (user_id, tag) VALUES ($1, $2)`,
      [userId, payload.tag]
    );
  }
  return { sent, subscriptions: rows.length };
}

export async function lastSentAt(
  userId: string,
  tag: string
): Promise<Date | null> {
  const { rows } = await query<{ sent_at: string }>(
    `SELECT sent_at FROM notification_log
      WHERE user_id = $1 AND tag = $2
      ORDER BY sent_at DESC LIMIT 1`,
    [userId, tag]
  );
  return rows[0] ? new Date(rows[0].sent_at) : null;
}
