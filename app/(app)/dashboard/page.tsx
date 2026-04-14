import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { DeveloperDashboard } from "./DeveloperDashboard";

export default async function DashboardPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.kokuUser.role === "owner") redirect("/dashboard/owner");
  return <DeveloperDashboard />;
}
