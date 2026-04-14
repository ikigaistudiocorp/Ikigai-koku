import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { BaselineForm } from "./BaselineForm";

export default async function BaselineOnboardingPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.kokuUser.role !== "owner") redirect("/clock");
  if (current.kokuUser.baseline_completed) redirect("/clock");

  const { rows: members } = await query<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>(
    `SELECT u.id, u.name, u.email, k.role
       FROM koku_users k
       JOIN "user" u ON u.id = k.id
      ORDER BY k.created_at ASC`
  );

  return (
    <main className="flex-1 px-5 py-10 max-w-2xl mx-auto w-full">
      <BaselineForm members={members} />
    </main>
  );
}
