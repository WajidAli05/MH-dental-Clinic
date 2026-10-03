/*
 * Signed distance fields for anatomically shaped teeth and gums (no imports: Node runs this
 * directly during `npm run bake:teeth`).
 *
 * Tooth frame: crown up, the cervical line (where enamel meets root) at y = 0,
 * x = mesiodistal (along the arch), +z = buccal/labial (cheek or lip side).
 * Units: 1 unit is about 22 mm. Negative = inside.
 */

const sq = (v: number) => v * v;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Polynomial smooth minimum: blends two shapes with a fillet of size k. */
export function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
/** Smooth subtraction-friendly maximum. */
export function smax(a: number, b: number, k: number) {
  return -smin(-a, -b, k);
}

export function sdEllipsoid(x: number, y: number, z: number, rx: number, ry: number, rz: number) {
  const k0 = Math.sqrt(sq(x / rx) + sq(y / ry) + sq(z / rz));
  const k1 = Math.sqrt(sq(x / (rx * rx)) + sq(y / (ry * ry)) + sq(z / (rz * rz)));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

export function sdRoundBox(x: number, y: number, z: number, bx: number, by: number, bz: number, r: number) {
  const qx = Math.abs(x) - bx + r;
  const qy = Math.abs(y) - by + r;
  const qz = Math.abs(z) - bz + r;
  const outside = Math.sqrt(sq(Math.max(qx, 0)) + sq(Math.max(qy, 0)) + sq(Math.max(qz, 0)));
  return outside + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
}

/** A cone with rounded ends between points a and b with radii r1 and r2 (after Inigo Quilez). */
export function sdRoundCone(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r1: number, r2: number,
) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const cx = pax * l2 - bax * y, cy = pay * l2 - bay * y, cz = paz * l2 - baz * y;
  const x2 = cx * cx + cy * cy + cz * cz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

/** A root: tapered, broad cheek-to-tongue and narrow front-to-back, curving slightly distally. */
function root(x: number, y: number, z: number, ax: number, ay: number, bx: number, by: number, r1: number, r2: number, broad = 1.35, bend = 0.07) {
  const xb = x - bend * sq(Math.min(y, 0)); // gentle distal curve toward the apex
  return sdRoundCone(xb, y, z / broad, ax, ay, 0, bx, by, 0, r1, r2) * Math.min(1, broad);
}

/* ---------------- Molar (lower first molar) ---------------- */
export function sdMolar(x: number, y: number, z: number) {
  // Crown: a rounded block that bulges at its widest point and narrows to the neck.
  let d = sdRoundBox(x, y - 0.18, z, 0.25, 0.15, 0.235, 0.12);
  d = smin(d, sdEllipsoid(x, y - 0.13, z, 0.262, 0.115, 0.245), 0.05);
  // Four cusps.
  const cusp = (cx: number, cz: number, s: number) => sdEllipsoid(x - cx, y - 0.295, z - cz, 0.11 * s, 0.085 * s, 0.1 * s);
  let c = cusp(-0.12, 0.1, 1.04);
  c = Math.min(c, cusp(0.12, 0.1, 1));
  c = Math.min(c, cusp(-0.12, -0.1, 0.98));
  c = Math.min(c, cusp(0.12, -0.1, 0.94));
  c = Math.min(c, sdEllipsoid(x - 0.205, y - 0.26, z - 0.11, 0.07, 0.07, 0.07)); // small distal cusp
  d = smin(d, c, 0.06);
  // Occlusal grooves: a mesiodistal and a buccolingual fissure carved into the top.
  d = smax(d, -sdEllipsoid(x, y - 0.37, z, 0.21, 0.075, 0.026), 0.035);
  d = smax(d, -sdEllipsoid(x, y - 0.37, z, 0.026, 0.07, 0.19), 0.035);
  // Root trunk and two roots, splayed and flattened mesiodistally.
  const trunk = sdRoundCone(x, y, z / 1.12, 0, 0.04, 0, 0, -0.13, 0, 0.19, 0.165);
  d = smin(d, trunk, 0.07);
  const roots = Math.min(
    root(x, y, z, -0.11, -0.08, -0.17, -0.63, 0.1, 0.033),
    root(x, y, z, 0.11, -0.08, 0.13, -0.58, 0.093, 0.033, 1.3, 0.04),
  );
  return smin(d, roots, 0.07);
}

/* ---------------- Premolar ---------------- */
export function sdPremolar(x: number, y: number, z: number) {
  let d = sdRoundBox(x, y - 0.19, z, 0.16, 0.16, 0.18, 0.12);
  d = smin(d, sdEllipsoid(x, y - 0.14, z, 0.165, 0.12, 0.185), 0.05);
  const buccal = sdEllipsoid(x, y - 0.31, z - 0.07, 0.115, 0.1, 0.1);
  const lingual = sdEllipsoid(x, y - 0.285, z + 0.08, 0.095, 0.08, 0.085);
  d = smin(d, Math.min(buccal, lingual), 0.055);
  d = smax(d, -sdEllipsoid(x, y - 0.375, z, 0.13, 0.06, 0.022), 0.03);
  const r = sdRoundCone(x, y, z / 1.25, 0, 0.03, 0, 0.015, -0.66, 0, 0.145, 0.03);
  return smin(d, r, 0.08);
}

/* ---------------- Canine ---------------- */
export function sdCanine(x: number, y: number, z: number) {
  let d = sdRoundCone(x, y, z, 0, 0.06, 0, 0, 0.39, 0.01, 0.165, 0.028);
  d = smin(d, sdEllipsoid(x, y - 0.17, z, 0.172, 0.15, 0.165), 0.06);
  // A soft labial ridge running to the tip.
  d = smin(d, sdRoundCone(x, y, z, 0, 0.1, 0.12, 0, 0.36, 0.03, 0.05, 0.02), 0.05);
  const r = sdRoundCone(x, y, z / 1.2, 0, 0.03, 0, 0, -0.78, -0.02, 0.152, 0.032);
  return smin(d, r, 0.08);
}

/* ---------------- Incisor (upper central) ---------------- */
export function sdIncisor(x: number, y: number, z: number) {
  // Smooth shovel crown: a flattened oval that is narrow and thick at the neck and grows
  // wider and thinner toward a straight, rounded biting edge. The back is hollowed (the
  // lingual fossa) and the lip side stays gently convex.
  const s = clamp(y / 0.46, 0, 1);
  const xx = x * mix(1.18, 0.96, s); // narrower at the neck
  const zz = (z + 0.012) * mix(0.95, 2.5, s * s); // thinner toward the edge
  let d = sdEllipsoid(xx, y - 0.19, zz, 0.19, 0.31, 0.105) * 0.8;
  d = smax(d, y - 0.455, 0.045); // straight incisal edge, softly rounded corners
  d = smax(d, -sdEllipsoid(x, y - 0.27, z + 0.115, 0.12, 0.19, 0.05), 0.03); // lingual fossa
  d = smax(d, -y - 0.05, 0.04);
  const rt = sdRoundCone(x, y, z / 1.1, 0, 0.02, -0.01, 0, -0.64, -0.035, 0.135, 0.028);
  return smin(d, rt, 0.08);
}

export const TOOTH_SDF = { molar: sdMolar, premolar: sdPremolar, canine: sdCanine, incisor: sdIncisor };

/** Bounding box (min, max) of each tooth in tooth units, with a little margin. */
export const TOOTH_BOUNDS: Record<keyof typeof TOOTH_SDF, [number, number, number, number, number, number]> = {
  molar: [-0.36, -0.72, -0.34, 0.36, 0.44, 0.34],
  premolar: [-0.24, -0.74, -0.27, 0.24, 0.44, 0.27],
  canine: [-0.24, -0.86, -0.25, 0.24, 0.46, 0.25],
  incisor: [-0.26, -0.72, -0.22, 0.26, 0.52, 0.22],
};

/** Crown only: everything below the gum line (a little under the neck) is cut away. */
export function crownOnly(d: number, y: number) {
  return smax(d, -(y + 0.07), 0.03);
}

/* ---------------- Gum ---------------- */

export type GumInput = {
  polyline: [number, number][]; // arch centreline in xz
  teeth: { x: number; z: number; rotY: number; width: number }[];
  papillae: { x: number; z: number; rotY: number }[];
};

function distToPolyline(px: number, pz: number, pl: [number, number][]) {
  let best = Infinity;
  for (let i = 0; i < pl.length - 1; i++) {
    const [ax, az] = pl[i];
    const [bx, bz] = pl[i + 1];
    const vx = bx - ax, vz = bz - az;
    const t = clamp(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz), 0, 1);
    const dx = px - ax - vx * t, dz = pz - az - vz * t;
    const dd = dx * dx + dz * dz;
    if (dd < best) best = dd;
  }
  return Math.sqrt(best);
}

/** A rotated ellipsoid in the xz plane (turned to follow the arch). */
function sdRotEllipsoid(x: number, y: number, z: number, cx: number, cy: number, cz: number, rot: number, rx: number, ry: number, rz: number) {
  const dx = x - cx, dz = z - cz;
  const c = Math.cos(rot), s = Math.sin(rot);
  return sdEllipsoid(dx * c - dz * s, y - cy, dx * s + dz * c, rx, ry, rz);
}

/**
 * The gingiva of one jaw (crowns-up frame): a rounded ridge following the arch, with collars
 * hugging each tooth neck and papillae rising between neighbours: the scalloped gum line.
 */
export function makeGumSdf(input: GumInput) {
  return (x: number, y: number, z: number) => {
    if (y > 0.3 || y < -0.75) return 1;
    const dh = distToPolyline(x, z, input.polyline);
    if (dh > 0.6) return dh - 0.4;
    // Ridge cross-section: rounded rectangle, half width 0.33, from the gum line down to the bone.
    const qx = dh - 0.33 + 0.15;
    const qy = Math.abs(y + 0.3) - 0.29 + 0.15;
    let d = Math.sqrt(sq(Math.max(qx, 0)) + sq(Math.max(qy, 0))) + Math.min(Math.max(qx, qy), 0) - 0.15;
    // Collars around each tooth neck.
    let collar = Infinity;
    for (const t of input.teeth) {
      if (Math.abs(x - t.x) > 0.5 || Math.abs(z - t.z) > 0.5) continue;
      collar = Math.min(collar, sdRotEllipsoid(x, y, z, t.x, -0.015, t.z, t.rotY, t.width * 0.56, 0.055, 0.31));
    }
    // Papillae: soft peaks between teeth.
    let pap = Infinity;
    for (const p of input.papillae) {
      if (Math.abs(x - p.x) > 0.4 || Math.abs(z - p.z) > 0.4) continue;
      pap = Math.min(pap, sdRotEllipsoid(x, y, z, p.x, 0.0, p.z, p.rotY, 0.07, 0.115, 0.27));
    }
    d = smin(d, collar, 0.06);
    d = smin(d, pap, 0.05);
    return d;
  };
}
