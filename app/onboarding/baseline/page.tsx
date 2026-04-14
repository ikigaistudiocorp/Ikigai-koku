// Baseline onboarding UI is built in Phase 1.4. This placeholder exists so
// that the middleware/layout redirect has a target during Phase 1.3 verification.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";

export default async function BaselineOnboardingPlaceholder() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return (
    <main className="flex-1 grid place-items-center px-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading text-ikigai-purple">
          Bienvenido a Koku
        </h1>
        <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
          Onboarding baseline — to be built in Phase 1.4.
        </p>
      </div>
    </main>
  );
}
