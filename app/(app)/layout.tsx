import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.needsBaseline) redirect("/onboarding/baseline");
  return <>{children}</>;
}
