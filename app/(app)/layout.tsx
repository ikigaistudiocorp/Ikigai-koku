import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ActiveTimerBanner } from "@/components/ActiveTimerBanner";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.needsBaseline) redirect("/onboarding/baseline");

  return (
    <>
      <TopBar />
      <PushPermissionPrompt />
      <ActiveTimerBanner />
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav />
    </>
  );
}
