"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, User } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { useTranslation } from "@/lib/i18n";

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

  const inputShell =
    "w-full pl-10 pr-4 py-2.5 bg-ikigai-cream dark:bg-ikigai-dark/40 border border-black/[0.08] dark:border-white/[0.10] rounded-xl text-ikigai-dark dark:text-ikigai-cream placeholder:text-ikigai-dark/30 dark:placeholder:text-ikigai-cream/30 focus:outline-none focus:ring-1 focus:ring-ikigai-purple focus:border-ikigai-purple transition-colors";

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-ikigai-card border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-8 space-y-6 shadow-lg"
    >
      <h2 className="text-xl font-medium text-ikigai-dark dark:text-ikigai-cream text-center">
        {mode === "signin" ? t("login_signin") : t("login_register")}
      </h2>

      {error && (
        <div className="bg-ikigai-rose/10 border border-ikigai-rose/30 text-ikigai-rose text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {mode === "register" && (
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-ikigai-dark/70 dark:text-ikigai-cream/70 mb-1.5"
            >
              {t("login_name")}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ikigai-dark/30 dark:text-ikigai-cream/30" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputShell}
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-ikigai-dark/70 dark:text-ikigai-cream/70 mb-1.5"
          >
            {t("login_email")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ikigai-dark/30 dark:text-ikigai-cream/30" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className={inputShell}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ikigai-dark/70 dark:text-ikigai-cream/70 mb-1.5"
          >
            {t("login_password")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ikigai-dark/30 dark:text-ikigai-cream/30" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className={inputShell}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-ikigai-dark hover:bg-ikigai-purple text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            {mode === "signin" ? t("login_signin") : t("login_register")}
          </>
        )}
      </button>

      <p className="text-center text-sm text-ikigai-dark/50 dark:text-ikigai-cream/50 font-light">
        {mode === "signin" ? (
          <>
            {t("login_first_user_cta")}{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className="text-ikigai-purple hover:underline"
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
            className="text-ikigai-purple hover:underline"
          >
            {t("login_back_to_signin")}
          </button>
        )}
      </p>
    </motion.form>
  );
}
