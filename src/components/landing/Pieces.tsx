"use client";
/* Les tours de pièces montent quand elles arrivent à l'écran. */
import { useEffect, useRef, useState } from "react";
import { Ancre } from "@/components/monde/Ancre";

export function Pieces() {
  const ref = useRef<HTMLSpanElement>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVu(e.isIntersecting), { threshold: 0.4 });
    o.observe(ref.current!);
    return () => o.disconnect();
  }, []);
  return (
    <span ref={ref} className="absolute inset-x-[4%] bottom-0 block h-full">
      <Ancre nom="pieces" className="h-full w-full" pose={{ rx: 0.34, flotte: 0, suit: 0.6, z: 120 }} donnees={{ valeur: vu ? 0.85 : 0 }} />
    </span>
  );
}
