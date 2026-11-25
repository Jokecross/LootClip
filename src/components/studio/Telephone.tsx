/* Le téléphone du studio : un cadre 9:16 dans lequel joue une vraie vidéo. Il prend toute la place de sa case. */
export function Telephone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`grid place-items-center [container-type:size] ${className}`}>
      <span className="telephone relative block border-2 border-encre bg-blanc">
        <span className="ecran absolute block overflow-hidden border-2 border-encre bg-encre">
          {children}
          <span className="absolute left-1/2 top-[1.6%] z-10 block h-[2.6%] w-[30%] -translate-x-1/2 rounded-full bg-encre" />
        </span>
      </span>
    </span>
  );
}
