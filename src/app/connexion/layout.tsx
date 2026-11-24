import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: false } };

export default function LayoutConnexion({ children }: { children: React.ReactNode }) {
  return children;
}
