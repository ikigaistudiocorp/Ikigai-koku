"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TABS: Array<{ href: string; key: string; icon: string }> = [
  { href: "/clock", key: "nav_clock", icon: "⏱" },
  { href: "/dashboard", key: "nav_dashboard", icon: "📊" },
  { href: "/projects", key: "nav_projects", icon: "🗂" },
  { href: "/reports", key: "nav_reports", icon: "📋" },
];

export function BottomNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-20 bg-white/90 dark:bg-ikigai-card/90 backdrop-blur border-t border-black/[0.06] dark:border-white/[0.06]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px]",
                  active
                    ? "text-ikigai-purple"
                    : "text-ikigai-dark/60 dark:text-ikigai-cream/60"
                )}
              >
                <span className="text-lg" aria-hidden>
                  {tab.icon}
                </span>
                <span>{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
