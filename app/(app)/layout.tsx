import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ActiveTimerBanner } from "@/components/ActiveTimerBanner";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";
import { PendingStopBanner } from "@/components/PendingStopBanner";

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
      <PendingStopBanner />
      <ActiveTimerBanner />
      <div
        className="flex-1 flex flex-col"
        style={{
          paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>
      <BottomNav />
    </>
  );
}
