"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/clock";

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const res = await signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "signin_failed");
      } else {
        const res = await signUp.email({ email, name, password });
        if (res.error) throw new Error(res.error.message || "signup_failed");
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common_error"));
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full h-14 px-4 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 text-base focus:outline-none focus:ring-2 focus:ring-ikigai-purple";

  return (
    <main className="flex-1 grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-5xl font-heading text-ikigai-purple">
            {t("app_name")}
          </h1>
          <p className="font-mono text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {t("app_tagline")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="text-sm mb-1 block">{t("login_name")}</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                autoComplete="name"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm mb-1 block">{t("login_email")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
              autoComplete="email"
              autoCapitalize="none"
            />
          </label>
          <label className="block">
            <span className="text-sm mb-1 block">{t("login_password")}</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>

          {error && (
            <p className="text-sm text-ikigai-rose" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-lg bg-ikigai-purple text-white font-medium disabled:opacity-60"
          >
            {loading
              ? "..."
              : mode === "signin"
                ? t("login_signin")
                : t("login_register")}
          </button>

          <p className="text-center text-xs text-ikigai-dark/60 dark:text-ikigai-cream/60">
            {mode === "signin" ? (
              <>
                {t("login_first_user_cta")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="underline"
                >
                  {t("login_register_link")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="underline"
              >
                {t("login_back_to_signin")}
              </button>
            )}
          </p>
        </form>
      </div>
    </main>
  );
}
