import type { Metadata } from "next";

// Même titre d'onglet que l'accueil : rien ne doit trahir le tournage.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutTournage({ children }: { children: React.ReactNode }) {
  return children;
}
