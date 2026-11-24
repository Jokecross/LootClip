/*
 * Le moteur du monde. Une unité = un pixel de la page (à z = 0) : chaque objet se cale sur le rectangle de son ancre,
 * avec des ressorts. Chargé à la demande par Monde.tsx.
 */
import * as THREE from "three";
import { pop } from "@/lib/sons";
import { aplat, cadenas, chrono, clip, etoile, manette, matieres, pieces, telephone, uniformes, type Objet } from "./objets";
import { C, ecranJeu, ecranLien, ecranProfil, ecranSource, scene as peindreScene } from "./peintures";
import { ancres, eclatsEnAttente, type Donnees, type Entree, type Nom, type Pose } from "./store";

const FOV = 24;

type Acteur = {
  nom: Nom;
  o: Objet;
  x: number; y: number; e: number; vx: number; vy: number; ve: number;
  rx: number; ry: number; rz: number; vrx: number; vry: number; vrz: number;
  tour: number; vtour: number;
  saut: number; vsaut: number;
  dernierTour?: number;
  dernierEtat?: string;
  vu: boolean;
  t0: number;
  envol: number;
  phase: number;
  donnees: Donnees;
};

const ressort = (x: number, v: number, cible: number, k: number, a: number, dt: number): [number, number] => {
  const n = v + (-(x - cible) * k - v * a) * dt;
  return [x + n * dt, n];
};

export function demarrer(toile: HTMLCanvasElement) {
  const rendu = new THREE.WebGLRenderer({ canvas: toile, alpha: true, antialias: true, powerPreference: "high-performance" });
  rendu.outputColorSpace = THREE.LinearSRGBColorSpace;
  rendu.setClearColor(0x000000, 0);
  const monde = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(FOV, 1, 10, 9000);
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let L = 1;
  let H = 1;
  // Définition : elle baisse toute seule si l'appareil ne suit pas.
  let definition = Math.min(1.75, devicePixelRatio || 1);
  let lentes = 0;

  function taille() {
    L = toile.clientWidth || innerWidth;
    H = toile.clientHeight || innerHeight;
    rendu.setPixelRatio(definition);
    rendu.setSize(L, H, false);
    cam.aspect = L / H;
    cam.position.z = H / 2 / Math.tan((FOV * Math.PI) / 360);
    cam.far = cam.position.z + 4000;
    cam.updateProjectionMatrix();
    const ep = L < 1024 ? 2 : 3;
    uniformes.uEp.value = ep;
    uniformes.uOmbre.value.set((ep * 2) / L, (-ep * 6.5) / H);
  }
  taille();
  const redim = () => {
    taille();
    mesurerJusque = performance.now() / 1000 + 0.5;
  };
  addEventListener("resize", redim);

  const souris = { x: 0, y: 0, sx: 0, sy: 0 };
  const bouge = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    souris.x = (e.clientX / innerWidth) * 2 - 1;
    souris.y = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener("pointermove", bouge, { passive: true });

  /* ---------- Acteurs, fabriqués quand une ancre les demande ---------- */

  const COULEURS_CLIP = [C.rose, C.turquoise, C.jaune, C.orange, C.blanc];
  const fabriques: Record<Nom, () => Objet> = {
    manette: () => manette(false),
    manette2: () => manette(true),
    telephone: () => telephone(C.blanc, innerWidth < 1024 ? 400 : 540),
    telephone2: () => telephone(C.blanc, 400),
    telephone3: () => telephone(C.blanc, 400),
    pieces: () => pieces(),
    cadenas: () => cadenas(),
    chrono: () => chrono(),
    ...(Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`clip${i}`, () => clip(COULEURS_CLIP[i], (g) => peindreScene(g, 0, 0, 480, 270, i, 1.3 + i * 0.9))])) as unknown as Record<"clip0" | "clip1" | "clip2" | "clip3" | "clip4", () => Objet>),
  };
  const acteurs = new Map<Nom, Acteur>();

  // Les objets sont fabriqués d'avance, un par un, pendant que la page ne fait rien : plus d'à-coup au changement d'écran.
  const reserve = new Map<Nom, Objet>();
  const ORDRE: Nom[] = ["telephone", "manette", "clip0", "clip1", "clip2", "pieces", "clip3", "manette2", "telephone2", "telephone3", "clip4", "chrono", "cadenas"];
  function fabriquer(nom: Nom) {
    let o = reserve.get(nom);
    if (!o) {
      o = fabriques[nom]();
      o.racine.visible = false;
      monde.add(o.racine);
      reserve.set(nom, o);
    }
    return o;
  }
  const attendre: (f: () => void) => void = "requestIdleCallback" in window ? (f) => requestIdleCallback(() => f(), { timeout: 1200 }) : (f) => setTimeout(f, 120);
  function prevoir() {
    const nom = ORDRE.find((n) => !reserve.has(n));
    if (!nom || image === -1) return;
    const o = fabriquer(nom) as Objet & { texture?: THREE.Texture };
    if (o.texture) rendu.initTexture(o.texture);
    setTimeout(() => attendre(prevoir), 60);
  }

  function acteur(nom: Nom, x: number, y: number, e: number): Acteur {
    let a = acteurs.get(nom);
    if (!a) {
      const o = fabriquer(nom);
      a = { nom, o, x, y, e: e * 0.2, vx: 0, vy: 0, ve: 0, rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0, tour: 0, vtour: 0, saut: 0, vsaut: 0, vu: false, t0: 0, envol: 0, phase: acteurs.size * 1.7, donnees: {} };
      acteurs.set(nom, a);
    }
    return a;
  }

  /* ---------- Étoiles ---------- */

  const NB = 90;
  const geoE = etoile();
  const etoiles = [C.jaune, C.rose, C.turquoise, C.blanc].map((c) => {
    const m = new THREE.InstancedMesh(geoE, aplat(c, 0), NB);
    const k = new THREE.InstancedMesh(geoE, matieres.noir, NB);
    for (const x of [m, k]) {
      x.frustumCulled = false;
      x.count = 0;
      monde.add(x);
    }
    return { m, k };
  });
  type P = { x: number; y: number; z: number; vx: number; vy: number; r: number; vr: number; s: number; vie: number; c: number };
  let poussieres: P[] = [];
  function semer(x: number, y: number, n: number) {
    for (let i = 0; i < n && poussieres.length < NB; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 260 + Math.random() * 620;
      poussieres.push({ x: x - L / 2, y: H / 2 - y, z: 200 + Math.random() * 120, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 320, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 8 + Math.random() * 15, vie: 1, c: i % 4 });
    }
  }

  /* ---------- Écrans des téléphones ---------- */

  const ecrans = new Map<Nom, number>();
  const peints = new Set<Nom>();
  const images = new Map<Nom, string>();
  function peindre(a: Acteur, t: number) {
    const o = a.o as ReturnType<typeof telephone>;
    const d = a.donnees;
    const dernier = ecrans.get(a.nom) ?? -1;
    if (t - dernier < (a.nom === "telephone" ? 1 / 31 : 1 / 16)) return;
    // Vidéo : rien à repeindre tant que l'image n'a pas changé.
    if (d.source instanceof HTMLVideoElement) {
      const cle = `${d.source.currentTime}-${d.titre ?? ""}-${d.source.src}`;
      if (images.get(a.nom) === cle && t - dernier < 0.5) return;
      images.set(a.nom, cle);
    }
    ecrans.set(a.nom, t);
    const g = o.toile.getContext("2d")!;
    const k = o.toile.width / 360;
    g.setTransform(k, 0, 0, k, 0, 0);
    const h = o.toile.height / k;
    if (d.source) ecranSource(g, h, d.source, d.titre);
    else if (d.ecran === "abonnes" || d.ecran === "vide" || d.ecran === "non") ecranProfil(g, h, t, d.ecran);
    else if (d.ecran === "relier" || d.ecran === "relie") ecranLien(g, h, t, d.ecran === "relie");
    else ecranJeu(g, h, t, d.coupe);
    o.texture.needsUpdate = true;
  }

  /* ---------- Boucle ---------- */

  let image = 0;
  let fabrique = false; // un seul objet neuf par image
  let pret = false;
  let avant = 0;
  let repos = 0;
  let dernierSon = 0;
  let dernierClip = 0;
  let mesurerJusque = 0;
  let compteAncres = -1;
  let numero = 0;
  let defile = scrollY;

  /** L'ancre la plus proche du milieu de l'écran gagne, s'il y en a plusieurs du même nom. */
  const places = new WeakMap<Entree, DOMRect>();
  function choisir(t: number) {
    const choix = new Map<Nom, { e: Entree; r: DOMRect; d: number }>();
    // Les places ne sont relues que pendant une seconde après un changement, puis de temps en temps.
    if (ancres.size !== compteAncres || ancres.size !== [...ancres].filter((e) => places.has(e)).length) {
      compteAncres = ancres.size;
      mesurerJusque = t + 1.2;
    }
    numero++;
    const lire = t < mesurerJusque || numero % 12 === 0;
    for (const e of ancres) {
      let r = places.get(e);
      if (!r || lire) places.set(e, (r = e.el.getBoundingClientRect()));
      if (r.width < 4 || r.height < 4) continue;
      const d = Math.abs(r.top + r.height / 2 - H / 2);
      const c = choix.get(e.nom);
      if (!c || d < c.d) choix.set(e.nom, { e, r, d });
    }
    return choix;
  }

  function tic(ms: number) {
    const t = ms / 1000;
    const brut = t - avant || 0.016;
    const dt = Math.min(0.033, brut);
    // Trop d'images lentes d'affilée : on baisse un peu la définition.
    lentes = brut > 0.021 && brut < 0.2 ? lentes + 1 : Math.max(0, lentes - 0.5);
    if (lentes > 30 && definition > 1) {
      lentes = 0;
      definition = Math.max(1, definition - 0.25);
      taille();
    }
    avant = t;
    souris.sx += (souris.x - souris.sx) * Math.min(1, dt * 5);
    souris.sy += (souris.y - souris.sy) * Math.min(1, dt * 5);

    // Page qui défile : les objets suivent leur ancre sans traîner.
    const ds = scrollY - defile;
    defile = scrollY;
    if (ds) mesurerJusque = t + 0.3;
    if (ds && Math.abs(ds) < H) for (const a of acteurs.values()) a.y += ds;

    const choix = choisir(t);
    const cibles = new Map<Nom, { x: number; y: number; e: number }>();
    for (const [nom, { e, r }] of choix) {
      if (e.donnees.flux) continue;
      const a = acteurs.get(nom);
      const o = a?.o;
      const l = o?.l ?? 1;
      const h = o?.h ?? 1;
      cibles.set(nom, { x: r.left + r.width / 2 - L / 2, y: H / 2 - (r.top + r.height / 2), e: Math.min(r.width / l, r.height / h) });
    }

    fabrique = false;
    for (const [nom, { e, r }] of choix) {
      const d = e.donnees;
      const p: Pose = e.pose;
      let a = acteurs.get(nom);
      if (!a && !reserve.has(nom)) {
        if (fabrique) continue;
        fabrique = true;
        fabriquer(nom);
        continue;
      }
      if (!a) {
        a = acteur(nom, r.left + r.width / 2 - L / 2, -H * 0.75, Math.min(r.width, r.height));
        a.ry = -1.4;
        a.t0 = t + (d.retard ?? 0);
      }
      if (!a.vu) {
        // Il entre : il arrive d'en bas, en tournant.
        a.vu = true;
        a.t0 = t + (d.retard ?? 0);
        if (a.e < 2) {
          a.x = r.left + r.width / 2 - L / 2;
          a.y = H / 2 - r.bottom - H * 0.28;
          a.ry = (p.ry ?? 0) - 2.2;
          a.vx = a.vy = 0;
        }
      }
      a.donnees = d;
      if (t < a.t0 && a.e < 2) continue;

      const l = a.o.l;
      const h = a.o.h;
      let cx = r.left + r.width / 2 - L / 2;
      let cy = H / 2 - (r.top + r.height / 2);
      let ce = Math.min(r.width / l, r.height / h);
      let crx = (p.rx ?? 0) + souris.sy * 0.16 * (p.suit ?? 1);
      let cry = (p.ry ?? 0) + souris.sx * 0.28 * (p.suit ?? 1);
      let crz = p.rz ?? 0;
      const osc = calme ? 0 : 1;
      cy += Math.sin(t * 1.5 + a.phase) * (p.flotte ?? 8) * osc;
      crz += Math.sin(t * 1.1 + a.phase * 2) * 0.025 * osc;

      if (d.flux) {
        const de = cibles.get(d.flux.de);
        const vers = cibles.get(d.flux.vers);
        if (de && vers) {
          const duree = d.flux.duree ?? 3.6;
          const k = (((t - a.t0 + d.flux.delai) / duree) % 1 + 1) % 1;
          const u = Math.min(1, k / 0.62);
          const f = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          cx = de.x + (vers.x - de.x) * f;
          cy = de.y + (vers.y - de.y) * f + Math.sin(f * Math.PI) * Math.min(230, H * 0.2);
          const base = Math.min(r.width / l, r.height / h);
          ce = k > 0.62 ? 0 : base * Math.min(1, u * 5) * (u > 0.86 ? (1 - u) / 0.14 : 1);
          crz += (f - 0.5) * -0.7;
          cry += Math.sin(f * Math.PI * 2) * 0.9;
          a.x = cx;
          a.y = cy;
          a.e = ce;
          a.ry = cry;
          a.rz = crz;
          const recu = acteurs.get(d.flux.vers);
          if (recu && k > 0.6 && k < 0.6 + dt / duree + 0.004 && a.dernierEtat !== "recu") {
            a.dernierEtat = "recu";
            recu.vsaut += 3.2;
          } else if (k < 0.5) a.dernierEtat = "vol";
          const don = acteurs.get(d.flux.de);
          if (don && k < 0.02) don.vsaut = Math.max(don.vsaut, 1.1);
        }
      }

      if (d.etat === "oui") ce *= 1.13;
      if (d.etat === "non") {
        ce *= 0.86;
        crz += 0.14;
        crx += 0.35;
      }
      if (d.etat !== a.dernierEtat && !d.flux) {
        if (d.etat === "oui" && a.dernierEtat !== undefined) {
          a.tour = -Math.PI * 2;
          a.vsaut = 4.6;
          semer(r.left + r.width / 2, r.top + r.height / 2, 18);
        }
        a.dernierEtat = d.etat ?? "rien";
      }
      if (d.tour !== a.dernierTour) {
        if (a.dernierTour !== undefined || (d.tour ?? 0) > 0) a.tour = -Math.PI * 2;
        a.dernierTour = d.tour;
      }

      if (d.envol) {
        a.envol += dt;
        const k = a.envol;
        a.y += k < 0.35 ? -70 * dt : (k - 0.35) * 9000 * dt;
        a.rz += (k < 0.35 ? 0 : 0.25) * dt;
        if (k > 0.35 && Math.random() < 0.7) semer(a.x + L / 2, H / 2 - a.y + a.e * 0.5, 1);
      } else if (!d.flux) {
        if (a.envol) {
          a.envol = 0;
          a.e = 0.5;
        }
        const K = 62;
        const A = 10.5;
        [a.x, a.vx] = ressort(a.x, a.vx, cx, K, A, dt);
        [a.y, a.vy] = ressort(a.y, a.vy, cy, K, A, dt);
        [a.e, a.ve] = ressort(a.e, a.ve, ce, 90, 12, dt);
        [a.rx, a.vrx] = ressort(a.rx, a.vrx, crx, 70, 10, dt);
        [a.ry, a.vry] = ressort(a.ry, a.vry, cry, 60, 9, dt);
        [a.rz, a.vrz] = ressort(a.rz, a.vrz, crz, 70, 10, dt);
      }
      [a.tour, a.vtour] = ressort(a.tour, a.vtour, 0, 26, 7, dt);
      [a.saut, a.vsaut] = ressort(a.saut, a.vsaut, 0, 130, 9, dt);

      const z = p.z ?? 0;
      const f = (cam.position.z - z) / cam.position.z;
      a.o.racine.position.set(a.x * f, (a.y + a.saut * a.e * 0.16) * f, z);
      a.o.racine.scale.setScalar(Math.max(0.0001, a.e * f));
      a.o.corps.rotation.set(a.rx, a.ry + a.tour, a.rz);
      a.o.racine.visible = a.e > 1.5;
      animer(a, d, t, dt);
    }

    // Sans ancre : l'objet s'en va.
    for (const a of acteurs.values()) {
      if (choix.has(a.nom)) continue;
      a.vu = false;
      a.dernierEtat = undefined;
      a.dernierTour = undefined;
      a.envol = 0;
      if (a.e < 1.5) {
        a.o.racine.visible = false;
        a.e = 0;
        continue;
      }
      [a.e, a.ve] = ressort(a.e, a.ve, -0.5, 120, 20, dt);
      a.ry += dt * 6;
      a.o.racine.scale.setScalar(Math.max(0.0001, a.e));
      a.o.corps.rotation.y = a.ry;
    }

    // Étoiles
    while (eclatsEnAttente.length) {
      const e = eclatsEnAttente.shift()!;
      semer(e.x, e.y, e.n);
    }
    const n = [0, 0, 0, 0];
    poussieres = poussieres.filter((p) => p.vie > 0);
    for (const p of poussieres) {
      p.vy -= 1500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.vie -= dt * 0.85;
      m4.compose(v3.set(p.x, p.y, p.z), q.setFromEuler(eu.set(p.r * 0.6, p.r, p.r)), v3b.setScalar(p.s * Math.min(1, p.vie * 2.5)));
      etoiles[p.c].m.setMatrixAt(n[p.c], m4);
      etoiles[p.c].k.setMatrixAt(n[p.c]++, m4);
    }
    etoiles.forEach(({ m, k }, i) => {
      m.count = k.count = n[i];
      m.instanceMatrix.needsUpdate = k.instanceMatrix.needsUpdate = true;
    });

    if (pret) rendu.render(monde, cam);
    const vivant = choix.size || poussieres.length || [...acteurs.values()].some((a) => a.e > 1.5);
    repos = vivant ? 0 : repos + 1;
    image = repos > 3 ? 0 : requestAnimationFrame(tic);
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const v3b = new THREE.Vector3();

  function animer(a: Acteur, d: Donnees, t: number, dt: number) {
    if (!a.o.racine.visible) return;
    const p = a.o.pieces;
    if (a.nom.startsWith("telephone")) peindre(a, t);
    if (a.nom.startsWith("clip")) {
      // Le clip montre la vraie image du joueur quand on la lui donne.
      const o = a.o as ReturnType<typeof clip>;
      const v = d.source;
      const ok = v && (v instanceof HTMLVideoElement ? v.readyState >= 2 && !v.seeking && v.currentTime > 0 && v.videoWidth : v.width);
      if (ok && t - (ecrans.get(a.nom) ?? -1) > 0.16 + a.phase * 0.01 && t - dernierClip > 0.03) {
        ecrans.set(a.nom, t);
        dernierClip = t;
        const lv = v instanceof HTMLVideoElement ? v.videoWidth : v.width;
        const hv = v instanceof HTMLVideoElement ? v.videoHeight : v.height;
        const k = Math.max(480 / lv, 270 / hv);
        o.toile.getContext("2d")!.drawImage(v, (480 - lv * k) / 2, (270 - hv * k) / 2, lv * k, hv * k);
        o.texture.needsUpdate = true;
        peints.add(a.nom);
      } else if (!v && peints.delete(a.nom)) {
        const i = Number(a.nom.slice(4));
        peindreScene(o.toile.getContext("2d")!, 0, 0, 480, 270, i, 1.3 + i * 0.9);
        o.texture.needsUpdate = true;
      }
    }
    if (a.nom === "manette" || a.nom === "manette2") {
      const v = d.valeur ?? 0.35;
      const w = calme ? 0 : 1 + v * 3;
      for (const i of [0, 1]) p[`stick${i}`].rotation.set(Math.PI / 2 + Math.sin(t * w + i * 2) * 0.22, 0, Math.cos(t * w * 1.3 + i) * 0.22);
      for (let i = 0; i < 4; i++) p[`bouton${i}`].scale.z = Math.sin(t * (2 + v * 7) + i * 1.9) > 0.75 ? 0.45 : 1;
    }
    if (a.nom === "pieces") {
      (a.o as ReturnType<typeof pieces>).mettre(dt, d.valeur ?? 0.5, () => {
        if (t - dernierSon > 0.05) {
          dernierSon = t;
          pop(0.85);
        }
      });
    }
    if (a.nom === "chrono") {
      p.grande.rotation.z = -t * (0.6 + (d.valeur ?? 0.3) * 6);
      p.petite.rotation.z = -t * (0.1 + (d.valeur ?? 0.3));
    }
    if (a.nom === "cadenas") {
      p.xp.scale.x = 0.5 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.9;
    }
  }

  function reveiller() {
    repos = 0;
    if (!image && !document.hidden) {
      avant = performance.now() / 1000;
      image = requestAnimationFrame(tic);
    }
  }
  const visible = () => {
    if (document.hidden) {
      cancelAnimationFrame(image);
      image = 0;
    } else reveiller();
  };
  document.addEventListener("visibilitychange", visible);
  addEventListener("scroll", reveiller, { passive: true });
  // Les programmes de la carte graphique sont préparés à côté, sans bloquer la page. Puis la scène s'affiche.
  fabriquer("manette");
  fabriquer("pieces");
  fabriquer("clip0");
  for (const o of reserve.values()) o.racine.visible = true;
  rendu
    .compileAsync(monde, cam)
    .catch(() => {})
    .finally(() => {
      for (const [n, o] of reserve) if (!acteurs.has(n)) o.racine.visible = false;
      pret = true;
      reveiller();
      setTimeout(() => attendre(prevoir), 500);
    });

  return {
    reveiller,
    fermer() {
      cancelAnimationFrame(image);
      image = -1;
      removeEventListener("resize", redim);
      removeEventListener("pointermove", bouge);
      removeEventListener("scroll", reveiller);
      document.removeEventListener("visibilitychange", visible);
      rendu.dispose();
    },
  };
}
