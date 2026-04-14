import type { Metadata, Viewport } from "next";
import { DM_Sans, Shippori_Antique_B1, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const THEME_INIT = `(function(){try{var s=localStorage.getItem("koku-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const shippori = Shippori_Antique_B1({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Koku — The Time",
  description: "Time intelligence for AI-native teams.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/koku-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/koku-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#574683",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${shippori.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-ikigai-cream text-ikigai-dark dark:bg-ikigai-dark dark:text-ikigai-cream">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
