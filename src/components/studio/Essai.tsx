"use client";
import { useEffect, useRef } from "react";
import { Telephone } from "@/components/studio/Telephone";
import { VideoPortrait } from "@/components/studio/VideoPortrait";
import type { Style } from "@/lib/config";

/** Aperçu du rythme : le premier clip, coupé comme le fera le style choisi. */
export function Essai({ url, titre, style }: { url: string; titre: string; style: Style }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const video = ref.current;
      const d = video?.duration ?? 0;
      if (video && Number.isFinite(d) && d > 1) video.currentTime = Math.random() * (d - 0.9);
    }, { defi: 900, drole: 420, mission: 2600 }[style]);
    return () => clearInterval(id);
  }, [style]);
  return (
    <div className="relative h-full min-h-0">
      <Telephone className="absolute inset-0">
        <VideoPortrait url={url} titre={titre || "Ton titre"} lecteur={ref} muet />
      </Telephone>
    </div>
  );
}
