/* Le robot XP : notre logo avec des pattes. Sa barre montre l'avancée. */
export function Robot({ xp = 1, className = "" }: { /** De 0 à 1. */ xp?: number; className?: string }) {
  return (
    <span className={`robot ${className}`} aria-hidden="true">
      <span className="robot-antenne" />
      <svg viewBox="0 0 100 100">
        <rect x="1.500" y="1.500" width="97" height="97" rx="26" fill="#F05FA5" stroke="#1A0B2E" strokeWidth="2.500" />
        <g style={{ fontFamily: "var(--font-titre)", fontWeight: 800 }}>
          <text x="52.500" y="60" textAnchor="middle" fontSize="50" fill="#1A0B2E">
            XP
          </text>
          <text x="50" y="57" textAnchor="middle" fontSize="50" fill="#FDF5EA" stroke="#1A0B2E" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">
            XP
          </text>
        </g>
        <rect x="16" y="69" width="68" height="14" rx="7" fill="#FFFFFF" stroke="#1A0B2E" strokeWidth="2.500" />
        <rect x="17.500" y="70.500" width="65" height="11" rx="5.500" fill="#F9D477" style={{ transformBox: "fill-box", transformOrigin: "left", transform: `scaleX(${Math.max(0.08, xp)})` }} />
      </svg>
      <i />
      <i />
    </span>
  );
}
