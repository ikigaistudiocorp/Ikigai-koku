import { headers } from "next/headers";
import { auth } from "./auth";
import { query } from "./db";
import type { KokuUser } from "@/types";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type CurrentUser = {
  user: SessionUser;
  kokuUser: KokuUser;
  needsBaseline: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const { rows } = await query<KokuUser>(
    `SELECT id, role, preferred_language, timezone,
            after_hours_start::text AS after_hours_start,
            after_hours_end::text AS after_hours_end,
            weekly_mirror_enabled, baseline_completed,
            created_at
       FROM koku_users
      WHERE id = $1`,
    [session.user.id]
  );
  const kokuUser = rows[0];
  if (!kokuUser) return null;

  const needsBaseline =
    kokuUser.role === "owner" && !kokuUser.baseline_completed;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    kokuUser,
    needsBaseline,
  };
}
