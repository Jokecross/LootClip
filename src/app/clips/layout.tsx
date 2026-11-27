import type { Metadata } from "next";

export const metadata: Metadata = { title: "XPclip", robots: { index: false, follow: false } };

export default function LayoutClips({ children }: { children: React.ReactNode }) {
  return children;
}
