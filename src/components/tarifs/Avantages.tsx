import { OFFRES_PAYANTES, type OffrePayante } from "@/lib/config";

export function CocheOffre() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#6FE3D6" stroke="#1A0B2E" strokeWidth="2" />
      <path d="M7.500 12.400l3 3 6-6.400" fill="none" stroke="#1A0B2E" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Les avantages d'une offre, cochés. */
export function Avantages({ offre, plus }: { offre: OffrePayante; plus?: string }) {
  return (
    <>
      {OFFRES_PAYANTES[offre].avantages.map((a) => (
        <span key={a}>
          <CocheOffre />
          {a}
        </span>
      ))}
      {plus && (
        <span className="font-bold">
          <CocheOffre />
          {plus}
        </span>
      )}
    </>
  );
}
