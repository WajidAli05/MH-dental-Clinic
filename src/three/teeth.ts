/*
 * Dental models for every scene on the site.
 * The teeth and gums are sculpted from anatomical signed-distance fields (toothSdf.ts) and baked
 * offline into compact meshes (scripts/bake-teeth.ts -> public/models/*.bin). This module loads
 * them, paints natural colour gradients into the vertices, and provides shared materials.
 */
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
export { archCurve, archLayout, interdentalPoints, type ArchTooth, type ToothKind, type ToothName } from "./arch";
import type { ToothKind } from "./arch";

/* ---------- Loading the baked meshes ---------- */

function decode(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x3154484d) throw new Error("Not an MHT1 mesh");
  const n = dv.getUint32(4, true);
  const ni = dv.getUint32(8, true);
  const b = Array.from({ length: 6 }, (_, i) => dv.getFloat32(12 + i * 4, true));
  const posBytes = n * 6 + ((n * 6) % 4 ? 2 : 0);
  const qp = new Uint16Array(buf, 40, n * 3);
  const qn = new Int8Array(buf, 40 + posBytes, n * 4);
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const c = i % 3;
    pos[i] = b[c] + (qp[i] / 65535) * (b[c + 3] - b[c]);
  }
  for (let v = 0; v < n; v++) {
    const x = qn[v * 4] / 127, y = qn[v * 4 + 1] / 127, z = qn[v * 4 + 2] / 127;
    const l = Math.hypot(x, y, z) || 1;
    nor[v * 3] = x / l;
    nor[v * 3 + 1] = y / l;
    nor[v * 3 + 2] = z / l;
  }
  const io = 40 + posBytes + n * 4;
  const index = n > 65535 ? new Uint32Array(buf.slice(io, io + ni * 4)) : new Uint16Array(buf.slice(io, io + ni * 2));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export class MeshBinLoader extends THREE.Loader<THREE.BufferGeometry> {
  load(url: string, onLoad: (g: THREE.BufferGeometry) => void, onProgress?: (e: ProgressEvent) => void, onError?: (e: unknown) => void) {
    const fl = new THREE.FileLoader(this.manager);
    fl.setResponseType("arraybuffer");
    fl.load(
      url,
      (data) => {
        try {
          onLoad(decode(data as ArrayBuffer));
        } catch (e) {
          onError?.(e);
        }
      },
      onProgress,
      onError,
    );
  }
}

const url = (name: string) => `/models/${name}.bin`;

/* ---------- Natural colour, painted into the vertices ---------- */

const C = (hex: string) => new THREE.Color(hex);
const ROOT_APEX = C("#d4b88a");
const ROOT = C("#e3cfa6");
const NECK = C("#ece0c6");
const BODY = C("#f5f1e8");
const EDGE = C("#e9eef0"); // the faintly translucent, cooler biting edge

function paintEnamel(g: THREE.BufferGeometry) {
  const p = g.attributes.position;
  const top = g.boundingBox!.max.y;
  const bottom = g.boundingBox!.min.y;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0) {
      const t = Math.min(1, y / Math.min(-0.01, bottom));
      c.copy(ROOT).lerp(ROOT_APEX, t * t);
      if (y > -0.05) c.lerp(NECK, 1 + y / 0.05);
    } else {
      const t = Math.min(1, y / Math.max(0.01, top));
      c.copy(NECK).lerp(BODY, Math.min(1, t * 2.8));
      if (t > 0.78) c.lerp(EDGE, (t - 0.78) / 0.22 * 0.7);
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

const GUM_MARGIN = C("#f1a2a6");
const GUM = C("#df7a85");
const GUM_DEEP = C("#c65666");
function paintGum(g: THREE.BufferGeometry) {
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > -0.04) c.copy(GUM).lerp(GUM_MARGIN, Math.min(1, (y + 0.04) / 0.1));
    else c.copy(GUM).lerp(GUM_DEEP, Math.min(1, (-0.04 - y) / 0.5));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

const painted = new WeakSet<THREE.BufferGeometry>();
const normalizedCache = new WeakMap<THREE.BufferGeometry, Map<string, THREE.BufferGeometry>>();

/** Raw tooth in arch units (cervical line at y = 0), coloured. For the mouth. */
export function useToothRaw(kind: ToothKind, crown = false) {
  const g = useLoader(MeshBinLoader, url(crown ? `${kind}-crown` : kind));
  if (!painted.has(g)) {
    paintEnamel(g);
    painted.add(g);
  }
  return g;
}

/** A tooth for single-tooth scenes: centred and scaled to height 1 (or width 1 for crowns). */
export function useTooth(kind: ToothKind, opts: { roots?: boolean } = {}) {
  const roots = opts.roots ?? true;
  const raw = useToothRaw(kind, !roots);
  let byKey = normalizedCache.get(raw);
  if (!byKey) normalizedCache.set(raw, (byKey = new Map()));
  const key = roots ? "h" : "w";
  let g = byKey.get(key);
  if (!g) {
    g = raw.clone();
    const box = raw.boundingBox!;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    g.translate(-center.x, -center.y, -center.z);
    const s = 1 / (roots ? size.y : size.x);
    g.scale(s, s, s);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    byKey.set(key, g);
  }
  return g;
}

export function useGum(jaw: "upper" | "lower") {
  const g = useLoader(MeshBinLoader, url(`gum-${jaw}`));
  if (!painted.has(g)) {
    paintGum(g);
    painted.add(g);
  }
  return g;
}

/** Warm every mesh up front so scenes do not wait on each other. */
export function preloadTeeth() {
  const names = ["molar", "premolar", "canine", "incisor", "molar-crown", "premolar-crown", "canine-crown", "incisor-crown"];
  useLoader.preload(MeshBinLoader, names.map(url));
}

/* ---------- Materials ---------- */

/** Enamel: satin-glossy, with the vertex colours doing the natural shading. */
export function enamel(tint = "#ffffff") {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    vertexColors: true,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
    sheen: 0.25,
    sheenColor: new THREE.Color("#ffffff"),
    sheenRoughness: 0.5,
    specularIntensity: 0.6,
  });
}
/** Kept for older call sites: now the same realistic enamel. */
export const porcelain = enamel;

export function gumMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.42,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    sheen: 0.7,
    sheenColor: new THREE.Color("#ffc8cf"),
  });
}

export function metal(color = "#c9ccd1", roughness = 0.22) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness });
}

/* ---------- Implant screw (lathed threads) ---------- */

let screw: THREE.BufferGeometry | null = null;
export function implantScrewGeometry() {
  if (!screw) {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, -0.5)];
    const threads = 11;
    for (let i = 0; i <= threads * 2; i++) {
      const t = i / (threads * 2);
      const y = -0.47 + t * 0.9;
      const taper = Math.min(1, 0.55 + t * 1.6);
      pts.push(new THREE.Vector2((i % 2 === 0 ? 0.13 : 0.19) * taper, y));
    }
    pts.push(new THREE.Vector2(0.15, 0.45), new THREE.Vector2(0.15, 0.5), new THREE.Vector2(0, 0.5));
    screw = new THREE.LatheGeometry(pts, 64);
    screw.computeVertexNormals();
  }
  return screw;
}

/* ---------- One shared studio environment ---------- */

const envByRenderer = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
export function studioEnvironment(gl: THREE.WebGLRenderer) {
  let tex = envByRenderer.get(gl);
  if (!tex) {
    const pmrem = new THREE.PMREMGenerator(gl);
    tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    envByRenderer.set(gl, tex);
  }
  return tex;
}
