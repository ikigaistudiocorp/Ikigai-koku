import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { UsersAdmin } from "./UsersAdmin";

export default async function UsersSettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.kokuUser.role !== "owner") redirect("/settings");

  const { rows } = await query<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>(
    `SELECT u.id, u.name, u.email, k.role
       FROM koku_users k JOIN "user" u ON u.id = k.id
      ORDER BY k.created_at`
  );

  return <UsersAdmin members={rows} />;
}
