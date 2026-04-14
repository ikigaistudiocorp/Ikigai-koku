"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ikigai-cream dark:bg-ikigai-dark relative overflow-hidden">
      {/* soft diagonal wash — same feel as Ringi */}
      <div className="absolute inset-0 bg-gradient-to-br from-ikigai-cream via-white to-ikigai-purple/[0.06] dark:from-ikigai-dark dark:via-ikigai-card dark:to-ikigai-purple/20" />

      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="text-center mb-10">
          <Image
            src="/images/koku-logo.svg"
            alt="Koku"
            width={180}
            height={60}
            className="mx-auto dark:invert"
            priority
          />
          <div className="flex items-end justify-center gap-3 mt-3">
            <span className="text-sm text-ikigai-dark/40 dark:text-ikigai-cream/40 mb-[10px]">
              by
            </span>
            <Image
              src="/images/ikigai-logo.svg"
              alt="Ikigai Studio"
              width={120}
              height={40}
              className="dark:invert"
            />
          </div>
        </div>

        {children}
      </motion.div>
    </div>
  );
}
