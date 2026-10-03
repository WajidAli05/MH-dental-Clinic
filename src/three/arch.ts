/*
 * The dental arch, shared by the offline bake (scripts/bake-teeth.ts) and the live site.
 * Units: 1 unit is about 22 mm, so a lower first molar crown (about 11 mm) is 0.5 wide.
 * This module imports only `three`, so Node can run it directly during the bake.
 */
import * as THREE from "three";

export type ToothKind = "molar" | "premolar" | "canine" | "incisor";
export type ToothName = "central" | "lateral" | "canine" | "premolar1" | "premolar2" | "molar1" | "molar2" | "wisdom";

export type ArchTooth = {
  kind: ToothKind;
  name: ToothName;
  side: -1 | 1;
  position: THREE.Vector3; // on the gum line (y = 0)
  rotationY: number; // turns the tooth's +z (cheek / lip side) to face outward
  tilt: number; // forward lean of the crown, radians
  scale: number; // relative to the sculpted tooth
  width: number; // mesiodistal width along the arch
};

// Mesiodistal crown widths in arch units, with the scale applied to the sculpted tooth.
const ORDER: { name: ToothName; kind: ToothKind; w: number; s: number; tilt: number }[] = [
  { name: "central", kind: "incisor", w: 0.39, s: 1, tilt: 0.22 },
  { name: "lateral", kind: "incisor", w: 0.31, s: 0.8, tilt: 0.2 },
  { name: "canine", kind: "canine", w: 0.35, s: 1, tilt: 0.12 },
  { name: "premolar1", kind: "premolar", w: 0.32, s: 1, tilt: 0.04 },
  { name: "premolar2", kind: "premolar", w: 0.31, s: 0.97, tilt: 0.02 },
  { name: "molar1", kind: "molar", w: 0.5, s: 1, tilt: -0.03 },
  { name: "molar2", kind: "molar", w: 0.46, s: 0.92, tilt: -0.05 },
  { name: "wisdom", kind: "molar", w: 0.42, s: 0.85, tilt: -0.07 },
];

/** A parabolic U: front teeth at +z, molars running back toward -z. */
export function archCurve() {
  const half: [number, number][] = [
    [0, 1.02],
    [-0.46, 0.88],
    [-0.86, 0.48],
    [-1.1, -0.18],
    [-1.22, -0.9],
    [-1.28, -1.62],
  ];
  const pts = [...half].reverse().map(([x, z]) => new THREE.Vector3(x, 0, z));
  for (const [x, z] of half.slice(1)) pts.push(new THREE.Vector3(-x, 0, z));
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

export function archLayout(count = 8): ArchTooth[] {
  const curve = archCurve();
  const length = curve.getLength();
  const out: ArchTooth[] = [];
  for (const side of [-1, 1] as const) {
    let s = 0;
    for (let i = 0; i < count; i++) {
      const o = ORDER[i];
      const center = s + o.w / 2;
      s += o.w + 0.012;
      const u = THREE.MathUtils.clamp(0.5 + (side * center) / length, 0, 1);
      const p = curve.getPointAt(u);
      const tan = curve.getTangentAt(u);
      const rotationY = Math.atan2(tan.x, tan.z) - Math.PI / 2;
      out.push({ kind: o.kind, name: o.name, side, position: p, rotationY, tilt: o.tilt, scale: o.s, width: o.w });
    }
  }
  return out;
}

/** Midpoints between neighbouring teeth, where the gum rises into a papilla. */
export function interdentalPoints(layout: ArchTooth[]) {
  const pts: { position: THREE.Vector3; rotationY: number }[] = [];
  for (const side of [-1, 1] as const) {
    const row = layout.filter((t) => t.side === side);
    for (let i = 0; i < row.length - 1; i++) {
      pts.push({
        position: row[i].position.clone().add(row[i + 1].position).multiplyScalar(0.5),
        rotationY: (row[i].rotationY + row[i + 1].rotationY) / 2,
      });
    }
  }
  // Between the two central incisors.
  const c = layout.filter((t) => t.name === "central");
  pts.push({ position: c[0].position.clone().add(c[1].position).multiplyScalar(0.5), rotationY: 0 });
  return pts;
}
