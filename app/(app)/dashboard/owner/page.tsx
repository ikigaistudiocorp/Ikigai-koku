import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { OwnerDashboard } from "./OwnerDashboard";

export default async function OwnerDashboardPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.kokuUser.role !== "owner") redirect("/dashboard");
  return <OwnerDashboard />;
}
