import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";

export default async function Home() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.needsBaseline) redirect("/onboarding/baseline");
  redirect(current.kokuUser.role === "owner" ? "/dashboard/owner" : "/clock");
}
