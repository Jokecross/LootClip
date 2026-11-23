/** Logo XPclip : « XP » crème cerclé d'encre sur fond rose, et la barre d'XP jaune qui se remplit. */
export function LogoIcone({ taille = 32, className = "" }: { taille?: number; className?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#F05FA5" />
      <g style={{ fontFamily: "var(--font-titre)", fontWeight: 800 }}>
        <text x="52.5" y="60" textAnchor="middle" fontSize="50" fill="#1A0B2E">
          XP
        </text>
        <text x="50" y="57" textAnchor="middle" fontSize="50" fill="#FDF5EA" stroke="#1A0B2E" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">
          XP
        </text>
      </g>
      <rect x="17" y="71" width="66" height="13" rx="6.5" fill="#1A0B2E" />
      <rect x="16" y="69" width="66" height="13" rx="6.5" fill="#FFFFFF" stroke="#1A0B2E" strokeWidth="3" />
      <rect x="17.5" y="70.5" width="40" height="10" rx="5" fill="#F9D477" />
      <line x1="57.5" y1="70.5" x2="57.5" y2="80.5" stroke="#1A0B2E" strokeWidth="3" />
    </svg>
  );
}

export function Logo({ taille = 32 }: { taille?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoIcone taille={taille} className="rounded-[24%] ring-2 ring-encre" />
      <span className="titre text-[20px]">XPclip</span>
    </span>
  );
}
