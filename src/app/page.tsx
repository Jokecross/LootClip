import type { Viewport } from "next";
import { Landing } from "@/components/accueil/Landing";

/* Accueil : la landing (components/accueil/Landing.tsx). */
export const viewport: Viewport = { themeColor: "#fdf5ea", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Accueil() {
  return <Landing />;
}
