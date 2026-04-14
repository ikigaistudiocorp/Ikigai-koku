"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export function TopBar() {
  const { setLanguage } = useTranslation();
  const { data: me } = useCurrentUser();

  const serverLang = me?.kokuUser?.preferred_language;
  const syncedOnce = useRef(false);
  useEffect(() => {
    if (syncedOnce.current) return;
    if (serverLang === "es" || serverLang === "en") {
      setLanguage(serverLang);
      syncedOnce.current = true;
    }
  }, [serverLang, setLanguage]);

  return (
    <header
      className="sticky top-0 inset-x-0 z-10 bg-ikigai-cream/90 dark:bg-ikigai-dark/90 backdrop-blur border-b border-black/[0.04] dark:border-white/[0.06]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 h-16">
        <Link href="/clock" className="flex items-center gap-3">
          <Image
            src="/images/ikigai-logo.svg"
            alt="Ikigai Studio"
            width={120}
            height={40}
            className="block dark:hidden h-9 w-auto"
          />
          <Image
            src="/images/ikigai-logo-dark.svg"
            alt="Ikigai Studio"
            width={120}
            height={40}
            className="hidden dark:block h-9 w-auto"
          />
          <span className="h-7 w-px bg-black/15 dark:bg-white/20" aria-hidden />
          <span className="font-heading text-2xl text-ikigai-dark dark:text-ikigai-cream leading-none">
            Koku <span className="text-ikigai-purple">刻</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {me?.user && (
            <Link
              href="/settings"
              title={`${me.user.name} · ${me.user.email}`}
              aria-label={me.user.name}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ikigai-purple text-white text-xs font-medium tracking-wide"
            >
              {initials(me.user.name)}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
