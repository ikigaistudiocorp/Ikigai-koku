"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export function TopBar() {
  return (
    <header
      className="sticky top-0 inset-x-0 z-10 bg-ikigai-cream/90 dark:bg-ikigai-dark/90 backdrop-blur border-b border-black/[0.04] dark:border-white/[0.06]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/clock" className="font-heading text-xl text-ikigai-purple">
          Koku
        </Link>
        <LanguageToggle />
      </div>
    </header>
  );
}
