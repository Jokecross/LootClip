import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { EnregistrerSW } from "@/components/EnregistrerSW";
import { Session } from "@/components/Session";
import "./globals.css";

// next/font héberge les polices sur notre domaine et les précharge.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-dmsans", display: "swap" });

export const metadata: Metadata = {
  title: "XPclip · Tes parties de GTA 6 peuvent te payer",
  description: "Joue à GTA 6 sur ta PS5 ou ta Xbox. XPclip transforme tes propres clips en vidéos prêtes à poster.",
  applicationName: "XPclip",
  appleWebApp: { capable: true, title: "XPclip", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FDF5EA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <Session />
        {children}
        <EnregistrerSW />
      </body>
    </html>
  );
}
