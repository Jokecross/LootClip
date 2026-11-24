/* Les objets du monde : formes simples et épaisses, aplats, contour d'encre et ombre pleine, comme la charte. */
import * as THREE from "three";
import { mergeGeometries, mergeVertices, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { C } from "./peintures";

THREE.ColorManagement.enabled = false; // les couleurs de la charte, telles quelles

export const uniformes = { uEp: { value: 3 }, uOmbre: { value: new THREE.Vector2(0, 0) } };

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 p = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

/** Aplat à deux tons, avec un éclat blanc net. */
const aplats = new Map<string, THREE.ShaderMaterial>();
export function aplat(couleur: string, brillant = 1) {
  const cle = `${couleur}-${brillant}`;
  let m = aplats.get(cle);
  if (!m) aplats.set(cle, (m = faireAplat(couleur, brillant)));
  return m;
}
function faireAplat(couleur: string, brillant: number) {
  const c = new THREE.Color(couleur);
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: c }, uB: { value: brillant } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uC; uniform float uB; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        vec3 l = normalize(vec3(-0.45, 0.75, 0.75));
        float d = dot(n, l);
        vec3 ombre = mix(uC, vec3(0.10, 0.04, 0.18), 0.26);
        vec3 c = mix(ombre, uC, smoothstep(0.16, 0.20, d));
        // Éclat fixe, de biais : il accroche les arrondis, jamais une face entière.
        float s = dot(n, normalize(vec3(-0.55, 0.72, 0.42)));
        c = mix(c, vec3(1.0), smoothstep(0.965, 0.972, s) * 0.8 * uB);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

const noir = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: uniformes,
  vertexShader: /* glsl */ `
    uniform float uEp;
    void main() {
      vec4 p = vec4(position, 1.0); vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
      #endif
      vec4 mv = modelViewMatrix * p;
      mv.xyz += normalize(normalMatrix * n) * uEp;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `void main() { gl_FragColor = vec4(0.102, 0.043, 0.18, 1.0); }`,
});

/** L'ombre pleine de la charte : la même silhouette, décalée vers le bas, derrière l'objet. */
const ombre = new THREE.ShaderMaterial({
  uniforms: uniformes,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    uniform float uEp; uniform vec2 uOmbre;
    void main() {
      vec4 p = vec4(position, 1.0); vec3 n = normal;
      vec4 mv = modelViewMatrix * p;
      mv.xyz += normalize(normalMatrix * n) * uEp;
      gl_Position = projectionMatrix * mv;
      gl_Position.xy += uOmbre * gl_Position.w;
      gl_Position.z += 0.02 * gl_Position.w;
    }`,
  fragmentShader: `void main() { gl_FragColor = vec4(0.102, 0.043, 0.18, 1.0); }`,
});

const texte = (t: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: { uT: { value: t } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D uT; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(uT, vUv).rgb;
        float r = vUv.x * 0.9 + vUv.y * 0.45;
        c = mix(c, vec3(1.0), (smoothstep(1.02, 1.025, r) - smoothstep(1.10, 1.105, r)) * 0.22);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

/* ---------- Formes ---------- */

export function arrondi(l: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -l / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + l - r, y);
  s.quadraticCurveTo(x + l, y, x + l, y + r);
  s.lineTo(x + l, y + h - r);
  s.quadraticCurveTo(x + l, y + h, x + l - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function epais(s: THREE.Shape | THREE.Shape[], profondeur: number, biseau: number, segments = 5) {
  const g = new THREE.ExtrudeGeometry(s, { depth: profondeur, bevelEnabled: biseau > 0, bevelSize: biseau, bevelThickness: biseau, bevelOffset: -biseau, bevelSegments: segments, curveSegments: 10 });
  g.translate(0, 0, -profondeur / 2);
  return toCreasedNormals(g, 0.5);
}

/* Deux objets pareils (clips, téléphones) partagent leurs formes. */
const formes = new Map<string, THREE.BufferGeometry>();
const une = <T extends THREE.BufferGeometry>(cle: string, f: () => T) => {
  let g = formes.get(cle);
  if (!g) formes.set(cle, (g = f()));
  return g as T;
};

/** Une face plate avec des coordonnées d'image propres. */
function face(l: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(arrondi(l, h, r), 10);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / l + 0.5, p.getY(i) / h + 0.5);
  return g;
}

/* ---------- Construction ---------- */

export class Objet {
  racine = new THREE.Group(); // place à l'écran
  corps = new THREE.Group(); // pose
  l = 1;
  h = 1;
  pieces: Record<string, THREE.Object3D> = {};
  private formes: THREE.BufferGeometry[] = [];
  /** `famille` : la silhouette est calculée une fois pour tous les objets de la même famille. */
  constructor(private famille = "") {
    this.racine.add(this.corps);
  }
  /** Ajoute une pièce. `contour` : elle compte dans la silhouette. */
  poser(geo: THREE.BufferGeometry, mat: THREE.Material, o: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; contour?: boolean; nom?: string } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    this.corps.add(m);
    if (o.nom) this.pieces[o.nom] = m;
    if (o.contour !== false && !formes.has(`silhouette-${this.famille}`)) {
      m.updateMatrix();
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m.matrix);
      for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
      const lisse = mergeVertices(g, 1e-4);
      lisse.computeVertexNormals();
      this.formes.push(lisse);
    }
    return m;
  }
  finir(l: number, h: number) {
    this.l = l;
    this.h = h;
    const cle = `silhouette-${this.famille}`;
    const g = formes.get(cle) ?? mergeGeometries(this.formes);
    if (g && this.famille) formes.set(cle, g);
    if (g) {
      this.corps.add(new THREE.Mesh(g, noir));
      const o = new THREE.Mesh(g, ombre);
      o.renderOrder = -1;
      this.corps.add(o);
    }
    this.formes = [];
    return this;
  }
}

const S = 1 / 200;
const px = (x: number) => (x - 120) * S;
const py = (y: number) => (92 - y) * S;

export function manette(decale: boolean) {
  const o = new Objet();
  const s = new THREE.Shape();
  const b = (a: number, c: number, d: number, e: number, f: number, g: number) => s.bezierCurveTo(px(a), py(c), px(d), py(e), px(f), py(g));
  s.moveTo(px(62), py(34));
  s.lineTo(px(178), py(34));
  b(202, 34, 212, 52, 219, 80);
  b(227, 111, 231, 142, 211, 150);
  b(192, 157, 181, 140, 168, 121);
  s.lineTo(px(72), py(121));
  b(59, 140, 48, 157, 29, 150);
  b(9, 142, 13, 111, 21, 80);
  b(28, 52, 38, 34, 62, 34);
  const corps = decale ? C.orange : C.fond;
  o.poser(epais(s, 0.13, 0.055, 7), aplat(corps));
  const z = 0.065 + 0.055;

  // Gâchettes
  for (const k of [-1, 1]) o.poser(epais(arrondi(0.2, 0.11, 0.045), 0.1, 0.03), aplat(C.rose), { x: k * 0.31, y: 0.285, z: -0.02, rz: k * -0.12 });

  // Centre
  if (decale) {
    o.poser(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), aplat(C.jaune), { y: py(56), z: z + 0.004, rx: Math.PI / 2, nom: "centre" });
  } else {
    o.poser(epais(arrondi(0.27, 0.17, 0.035), 0.012, 0.012), aplat(C.turquoise), { y: py(60), z, nom: "centre" });
  }
  // Petits boutons
  for (const k of [-1, 1]) o.poser(epais(arrondi(0.022, 0.06, 0.01), 0.01, 0.006), aplat(C.encre, 0.4), { x: k * (decale ? 0.1 : 0.17), y: py(decale ? 60 : 50), z, contour: false });

  // Croix
  const [gx, gy, cx, cy] = decale ? [62, 70, 92, 104] : [92, 104, 62, 72];
  const croix = new THREE.Shape();
  const a = 0.026;
  const e = 0.078;
  ([[-a, e], [a, e], [a, a], [e, a], [e, -a], [a, -a], [a, -e], [-a, -e], [-a, -a], [-e, -a], [-e, a], [-a, a]] as const).forEach(([x, y], i) => (i ? croix.lineTo(x, y) : croix.moveTo(x, y)));
  o.poser(epais(croix, 0.025, 0.008, 3), aplat(C.encre, 0.5), { x: px(cx), y: py(cy), z: z + 0.012, nom: "croix", contour: false });

  // Sticks
  ([[gx, gy], [148, 104]] as const).forEach(([x, y], i) => {
    o.poser(new THREE.CylinderGeometry(0.098, 0.105, 0.02, 32), aplat(C.encre, 0.4), { x: px(x), y: py(y), z: z, rx: Math.PI / 2, contour: false });
    const st = new THREE.Group();
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.07, 24), aplat(C.encre, 0.3));
    const haut = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.076, 0.035, 32), aplat(C.encre, 0.5));
    const creux = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.012, 32), aplat(C.rose));
    pied.position.y = 0.035;
    haut.position.y = 0.085;
    creux.position.y = 0.104;
    st.add(pied, haut, creux);
    st.position.set(px(x), py(y), z);
    st.rotation.x = Math.PI / 2;
    o.corps.add(st);
    o.pieces[`stick${i}`] = st;
  });

  // Boutons
  ([[180, 55, C.jaune], [198, 73, C.rose], [180, 91, C.turquoise], [162, 73, C.blanc]] as const).forEach(([x, y, c], i) => {
    const t = new THREE.CylinderGeometry(0.041, 0.044, 0.012, 24);
    o.poser(t, aplat(C.encre, 0), { x: px(x), y: py(y), z: z + 0.002, rx: Math.PI / 2, contour: false });
    const g = new THREE.SphereGeometry(0.035, 24, 14);
    g.scale(1, 1, 0.6);
    o.poser(g, aplat(c), { x: px(x), y: py(y), z: z + 0.016, contour: false, nom: `bouton${i}` });
  });
  return o.finir(1.1, 0.72);
}

/** Téléphone dont l'écran est exactement en 9:16 : la vidéo y tient entière. */
export function telephone(couleur: string, definition: number) {
  const o = new Objet("telephone");
  const H = 16 / 9;
  const toile = Object.assign(document.createElement("canvas"), { width: definition, height: Math.round(definition * H) });
  const t = new THREE.CanvasTexture(toile);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  o.poser(une("t1", () => epais(arrondi(0.6, 1.03, 0.1), 0.04, 0.026, 6)), aplat(couleur));
  const z = 0.02 + 0.026;
  const bord = une("t5", () => face(0.548, 0.96, 0.072));
  o.poser(bord, new THREE.MeshBasicMaterial({ color: C.encre }), { z: z + 0.001, contour: false });
  o.poser(une("t6", () => face(0.5265, 0.936, 0.06)), texte(t), { z: z + 0.003, contour: false });
  const encoche = new THREE.ShapeGeometry(arrondi(0.12, 0.028, 0.014), 8);
  o.poser(encoche, new THREE.MeshBasicMaterial({ color: C.encre }), { y: 0.44, z: z + 0.005, contour: false });
  o.poser(une("t2", () => epais(arrondi(0.02, 0.12, 0.008), 0.02, 0.006)), aplat(C.encre, 0.3), { x: 0.302, y: 0.2 });
  o.poser(une("t3", () => epais(arrondi(0.02, 0.07, 0.008), 0.02, 0.006)), aplat(C.encre, 0.3), { x: -0.302, y: 0.26 });
  // Dos : appareil photo
  o.poser(une("t4", () => epais(arrondi(0.17, 0.17, 0.05), 0.02, 0.012)), aplat(C.encre, 0.4), { x: 0.13, y: 0.37, z: -z - 0.005, contour: false });
  for (const [x, y] of [[0.1, 0.4], [0.16, 0.34]]) o.poser(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), aplat(C.turquoise), { x, y, z: -z - 0.028, rx: Math.PI / 2, contour: false });
  const fini = o.finir(0.62, 1.05);
  return Object.assign(fini, { toile, texture: t });
}

/** Un clip : une petite image 16:9 épaisse. */
export function clip(couleur: string, peindre: (g: CanvasRenderingContext2D) => void) {
  const o = new Objet("clip");
  const toile = Object.assign(document.createElement("canvas"), { width: 480, height: 270 });
  peindre(toile.getContext("2d")!);
  const t = new THREE.CanvasTexture(toile);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  o.poser(une("c7", () => epais(arrondi(1.06, 0.64, 0.1), 0.05, 0.03)), aplat(couleur));
  o.poser(une("c8", () => face(0.94, 0.52, 0.06)), texte(t), { z: 0.058, contour: false });
  o.poser(une("c90", () => new THREE.CylinderGeometry(0.115, 0.115, 0.03, 28)), aplat(C.blanc, 0), { z: 0.07, rx: Math.PI / 2, contour: false });
  const tri = new THREE.Shape();
  tri.moveTo(-0.035, 0.055);
  tri.lineTo(0.06, 0);
  tri.lineTo(-0.035, -0.055);
  o.poser(une("c91", () => epais(tri, 0.01, 0.006)), aplat(C.encre, 0), { z: 0.095, contour: false });
  const fini = o.finir(1.1, 0.68);
  return Object.assign(fini, { toile, texture: t });
}

/** Des tours de pièces. Chaque pièce tombe à sa place quand la valeur monte. */
export function pieces() {
  const MAX = 84;
  const o = new Objet();
  const R = 0.1;
  const E = 0.036;
  const cyl = new THREE.CylinderGeometry(R, R, E, 26);
  const bord = mergeVertices(
    (() => {
      const g = cyl.toNonIndexed();
      g.deleteAttribute("uv");
      g.deleteAttribute("normal");
      return g;
    })(),
    1e-4,
  );
  bord.computeVertexNormals();
  const disque = new THREE.CylinderGeometry(R * 0.72, R * 0.72, E * 1.12, 22);
  const anneau = new THREE.RingGeometry(R * 0.27, R * 0.4, 24, 1, 0.75, Math.PI * 2 - 1.5);
  const b1 = new THREE.PlaneGeometry(R * 0.42, R * 0.085).translate(-R * 0.22, R * 0.085, 0);
  const b2 = new THREE.PlaneGeometry(R * 0.42, R * 0.085).translate(-R * 0.22, -R * 0.085, 0);
  const euro = mergeGeometries([anneau, b1, b2])!;
  euro.rotateX(-Math.PI / 2);
  euro.translate(0, E * 0.57, 0);
  const meshes = [
    new THREE.InstancedMesh(cyl, aplat(C.jaune), MAX),
    new THREE.InstancedMesh(disque, aplat(C.orange, 0), MAX),
    new THREE.InstancedMesh(euro, new THREE.MeshBasicMaterial({ color: C.encre, side: THREE.DoubleSide }), MAX),
    new THREE.InstancedMesh(bord, noir, MAX),
  ];
  meshes.forEach((m) => {
    m.frustumCulled = false;
    o.corps.add(m);
  });
  const COL: [number, number, number][] = [[-0.5, 0, 0.75], [-0.27, 0.12, 1], [-0.02, -0.05, 1.5], [0.23, 0.13, 1.2], [0.47, 0, 0.8], [-0.38, 0.28, 0.5], [0.1, 0.3, 0.9], [0.36, 0.3, 0.5]];
  const places: { c: number; n: number }[] = [];
  const comptes = COL.map(() => 0);
  for (let i = 0; i < MAX; i++) {
    let m = 0;
    COL.forEach((c, k) => {
      if (comptes[k] / c[2] < comptes[m] / COL[m][2]) m = k;
    });
    places.push({ c: m, n: comptes[m]++ });
  }
  const etats = places.map((p, i) => ({ y: 2.4, v: 0, la: 0, ox: Math.sin(i * 91.7) * 0.014, oz: Math.cos(i * 47.3) * 0.014, ry: i * 2.4, p }));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const ax = new THREE.Vector3(0, 1, 0);
  let attente = 0;
  let actifs = 0;
  const mettre = (dt: number, valeur: number, impact: () => void) => {
    const voulu = Math.round(Math.max(0, Math.min(1, valeur)) * MAX);
    attente -= dt;
    if (attente <= 0 && actifs !== voulu) {
      const pas = Math.max(1, Math.ceil(Math.abs(voulu - actifs) / 14));
      for (let k = 0; k < pas && actifs !== voulu; k++) {
        if (actifs < voulu) {
          const e = etats[actifs++];
          e.y = e.p.n * E * 1.06 + 0.75 + Math.random() * 0.3;
          e.v = 0;
          e.la = 0.01;
        } else actifs--;
      }
      attente = 0.035;
    }
    etats.forEach((e, i) => {
      const sol = e.p.n * E * 1.06;
      if (i < actifs) {
        e.la = Math.min(1, e.la + dt * 9);
        e.v -= 9 * dt;
        e.y += e.v * dt;
        if (e.y < sol) {
          if (e.v < -0.7) {
            e.v *= -0.22;
            impact();
          } else e.v = 0;
          e.y = sol;
        }
      } else {
        e.la = Math.max(0, e.la - dt * 7);
      }
      const [x, z] = COL[e.p.c];
      q.setFromAxisAngle(ax, e.ry);
      const s = e.la;
      m4.compose(new THREE.Vector3(x + e.ox, e.y - 0.45, z * 0.75 + e.oz), q, new THREE.Vector3(s, s, s));
      meshes.forEach((m) => m.setMatrixAt(i, m4));
    });
    meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
  };
  o.l = 1.3;
  o.h = 1.0;
  return Object.assign(o, { mettre, actifs: () => actifs });
}

export function cadenas() {
  const o = new Objet();
  const arc = new THREE.TorusGeometry(0.22, 0.062, 18, 32, Math.PI);
  o.poser(arc, aplat(C.beige), { y: 0.2, nom: "anse" });
  for (const k of [-1, 1]) o.poser(new THREE.CylinderGeometry(0.062, 0.062, 0.16, 20), aplat(C.beige), { x: k * 0.22, y: 0.12 });
  o.poser(epais(arrondi(0.8, 0.62, 0.14), 0.2, 0.07, 6), aplat(C.rose), { y: -0.2 });
  o.poser(epais(arrondi(0.5, 0.1, 0.05), 0.02, 0.015), aplat(C.blanc, 0), { y: -0.36, z: 0.17, contour: false });
  o.poser(epais(arrondi(0.3, 0.07, 0.035), 0.02, 0.012), aplat(C.jaune, 0), { x: -0.085, y: -0.36, z: 0.185, contour: false, nom: "xp" });
  o.poser(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 28), aplat(C.encre, 0), { y: -0.12, z: 0.17, rx: Math.PI / 2, contour: false });
  o.poser(epais(arrondi(0.055, 0.14, 0.02), 0.02, 0.005), aplat(C.encre, 0), { y: -0.2, z: 0.17, contour: false });
  return o.finir(0.84, 1.1);
}

export function chrono() {
  const o = new Objet();
  o.poser(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 48), aplat(C.turquoise), { rx: Math.PI / 2 });
  o.poser(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 48), aplat(C.fond, 0), { rx: Math.PI / 2, z: 0.1, contour: false });
  o.poser(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 20), aplat(C.rose), { y: 0.48 });
  o.poser(epais(arrondi(0.22, 0.09, 0.04), 0.06, 0.02), aplat(C.rose), { y: 0.57 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    o.poser(new THREE.BoxGeometry(0.022, i % 3 ? 0.04 : 0.075, 0.01), aplat(C.encre, 0), { x: Math.sin(a) * 0.27, y: Math.cos(a) * 0.27, z: 0.125, rz: -a, contour: false });
  }
  for (const [nom, l, e] of [["grande", 0.24, 0.035], ["petite", 0.15, 0.05]] as const) {
    const g = new THREE.BoxGeometry(e, l, 0.02);
    g.translate(0, l / 2 - 0.02, 0);
    o.poser(g, aplat(nom === "grande" ? C.encre : C.rose, 0), { z: nom === "grande" ? 0.14 : 0.16, contour: false, nom });
  }
  o.poser(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 18), aplat(C.encre, 0), { z: 0.17, rx: Math.PI / 2, contour: false });
  return o.finir(0.9, 1.16);
}

export function etoile() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.46 : 1;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return epais(s, 0.3, 0.12, 2);
}

export const matieres = { noir };
