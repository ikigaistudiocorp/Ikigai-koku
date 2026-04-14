import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool, query } from "./db";

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  ),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    cookiePrefix: "koku",
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const existing = await query<{ count: string }>(
            "SELECT COUNT(*)::text AS count FROM koku_users"
          );
          const isFirst = existing.rows[0]?.count === "0";
          await query(
            `INSERT INTO koku_users (id, role)
             VALUES ($1, $2)
             ON CONFLICT (id) DO NOTHING`,
            [user.id, isFirst ? "owner" : "developer"]
          );
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
