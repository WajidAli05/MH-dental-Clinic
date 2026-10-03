/*
 * Bake the dental meshes once, offline: `npm run bake:teeth`.
 * SDF -> marching cubes -> weld -> Taubin smoothing -> meshoptimizer simplify -> quantised .bin
 * Output: public/models/*.bin (decoded by src/three/teeth.ts).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "meshoptimizer";
import { TOOTH_SDF, TOOTH_BOUNDS, crownOnly, makeGumSdf, type GumInput } from "../src/three/toothSdf.ts";
import { archCurve, archLayout, interdentalPoints } from "../src/three/arch.ts";

type Sdf = (x: number, y: number, z: number) => number;
const OUT = "public/models";
mkdirSync(OUT, { recursive: true });

function polygonise(sdf: Sdf, bounds: number[], voxel: number) {
  const [x0, y0, z0, x1, y1, z1] = bounds;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const L = Math.max(x1 - x0, y1 - y0, z1 - z0) * 1.04;
  const res = Math.min(300, Math.ceil(L / voxel));
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 900000);
  mc.isolation = 0;
  const half = res / 2;
  const f = mc.field;
  for (let k = 0; k < res; k++) {
    const z = cz + ((k - half) / half) * (L / 2);
    for (let j = 0; j < res; j++) {
      const y = cy + ((j - half) / half) * (L / 2);
      const row = k * res * res + j * res;
      for (let i = 0; i < res; i++) {
        const x = cx + ((i - half) / half) * (L / 2);
        const outside = x < x0 || x > x1 || y < y0 || y > y1 || z < z0 || z > z1;
        f[row + i] = outside ? -1 : -sdf(x, y, z);
      }
    }
  }
  mc.update();
  const n = mc.count;
  const src = mc.geometry.attributes.position.array as Float32Array;
  const pos = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    pos[v * 3] = cx + src[v * 3] * (L / 2);
    pos[v * 3 + 1] = cy + src[v * 3 + 1] * (L / 2);
    pos[v * 3 + 2] = cz + src[v * 3 + 2] * (L / 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return { geo: mergeVertices(g, 1e-6), res };
}

/** Taubin smoothing: alternating shrink/inflate Laplacian steps; smooths without shrinking. */
function taubin(geo: THREE.BufferGeometry, iterations = 10, lambda = 0.5, mu = -0.53) {
  const pos = geo.attributes.position.array as Float32Array;
  const idx = geo.index!.array;
  const n = pos.length / 3;
  const nbr: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    nbr[a].add(b).add(c);
    nbr[b].add(a).add(c);
    nbr[c].add(a).add(b);
  }
  const lists = nbr.map((s) => Int32Array.from(s));
  const tmp = new Float32Array(pos.length);
  const step = (w: number) => {
    for (let v = 0; v < n; v++) {
      const l = lists[v];
      if (!l.length) continue;
      let sx = 0, sy = 0, sz = 0;
      for (let q = 0; q < l.length; q++) {
        sx += pos[l[q] * 3];
        sy += pos[l[q] * 3 + 1];
        sz += pos[l[q] * 3 + 2];
      }
      const inv = 1 / l.length;
      tmp[v * 3] = pos[v * 3] + w * (sx * inv - pos[v * 3]);
      tmp[v * 3 + 1] = pos[v * 3 + 1] + w * (sy * inv - pos[v * 3 + 1]);
      tmp[v * 3 + 2] = pos[v * 3 + 2] + w * (sz * inv - pos[v * 3 + 2]);
    }
    pos.set(tmp);
  };
  for (let i = 0; i < iterations; i++) {
    step(lambda);
    step(mu);
  }
}

function simplify(geo: THREE.BufferGeometry, targetTris: number) {
  const pos = geo.attributes.position.array as Float32Array;
  const idx = Uint32Array.from(geo.index!.array);
  const [out] = MeshoptSimplifier.simplify(idx, pos, 3, Math.min(idx.length, targetTris * 3), 0.002);
  // Compact: keep only referenced vertices.
  const remap = new Int32Array(pos.length / 3).fill(-1);
  const newPos: number[] = [];
  const newIdx = new Uint32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    if (remap[v] < 0) {
      remap[v] = newPos.length / 3;
      newPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
    newIdx[i] = remap[v];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(newPos), 3));
  g.setIndex(new THREE.BufferAttribute(newIdx, 1));
  g.computeVertexNormals();
  return g;
}

/** Quantised binary: header, Uint16 positions, Int8 normals, Uint16/Uint32 indices. */
function write(name: string, geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  const pos = geo.attributes.position.array as Float32Array;
  const nor = geo.attributes.normal.array as Float32Array;
  const idx = geo.index!.array;
  const n = pos.length / 3;
  const wide = n > 65535;
  const posBytes = n * 6 + ((n * 6) % 4 ? 2 : 0);
  const size = 40 + posBytes + n * 4 + idx.length * (wide ? 4 : 2);
  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  dv.setUint32(0, 0x3154484d, true); // "MHT1"
  dv.setUint32(4, n, true);
  dv.setUint32(8, idx.length, true);
  [min.x, min.y, min.z, max.x, max.y, max.z].forEach((v, i) => dv.setFloat32(12 + i * 4, v, true));
  const qp = new Uint16Array(buf, 40, n * 3);
  const ext = [max.x - min.x, max.y - min.y, max.z - min.z];
  const lo = [min.x, min.y, min.z];
  for (let i = 0; i < n * 3; i++) qp[i] = Math.round(((pos[i] - lo[i % 3]) / (ext[i % 3] || 1)) * 65535);
  const qn = new Int8Array(buf, 40 + posBytes, n * 4);
  for (let v = 0; v < n; v++) for (let c = 0; c < 3; c++) qn[v * 4 + c] = Math.round(nor[v * 3 + c] * 127);
  const io = 40 + posBytes + n * 4;
  if (wide) new Uint32Array(buf, io, idx.length).set(idx);
  else new Uint16Array(buf, io, idx.length).set(idx);
  writeFileSync(`${OUT}/${name}.bin`, Buffer.from(buf));
  return { n, tris: idx.length / 3, kb: Math.round(size / 1024) };
}

// Optional filter: `npm run bake:teeth -- incisor incisor-crown` rebakes just those meshes.
const ONLY = process.argv.slice(2);

function bake(name: string, sdf: Sdf, bounds: number[], voxel: number, tris: number, smooth = 10) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const t0 = Date.now();
  const { geo, res } = polygonise(sdf, bounds, voxel);
  const raw = geo.index!.count / 3;
  taubin(geo, smooth);
  const out = simplify(geo, tris);
  const info = write(name, out);
  console.log(`${name.padEnd(16)} res ${res}  raw ${raw} tris -> ${info.tris} tris, ${info.n} verts, ${info.kb} KB  (${Date.now() - t0} ms)`);
}

await MeshoptSimplifier.ready;

for (const kind of ["molar", "premolar", "canine", "incisor"] as const) {
  const sdf = TOOTH_SDF[kind];
  const b = TOOTH_BOUNDS[kind];
  bake(kind, sdf, b, 0.0055, kind === "molar" ? 16000 : 11000);
  bake(`${kind}-crown`, (x, y, z) => crownOnly(sdf(x, y, z), y), [b[0], -0.12, b[2], b[3], b[4], b[5]], 0.0065, 5000);
}

// Gums, built around the same arch the site uses to place the teeth.
const layout = archLayout(8);
const polyline = archCurve()
  .getSpacedPoints(180)
  .map((p) => [p.x, p.z] as [number, number]);
const papillae = interdentalPoints(layout).map((p) => ({ x: p.position.x, z: p.position.z, rotY: p.rotationY }));
const teethFor = (skipMissing: boolean) =>
  layout
    .filter((t) => !(skipMissing && t.name === "molar1" && t.side === -1))
    .map((t) => ({ x: t.position.x, z: t.position.z, rotY: t.rotationY, width: t.width }));
// In the lower jaw one first molar is missing (the "gap" story): no collar, no papillae beside it.
const gap = layout.find((t) => t.name === "molar1" && t.side === -1)!;
const nearGap = (p: { x: number; z: number }) => Math.hypot(p.x - gap.position.x, p.z - gap.position.z) < gap.width * 0.75;
const gumBounds = [-1.75, -0.66, -1.95, 1.75, 0.2, 1.42];

const lower: GumInput = { polyline, teeth: teethFor(true), papillae: papillae.filter((p) => !nearGap(p)) };
const upper: GumInput = { polyline, teeth: teethFor(false), papillae };
bake("gum-lower", makeGumSdf(lower), gumBounds, 0.0115, 60000, 16);
bake("gum-upper", makeGumSdf(upper), gumBounds, 0.0115, 60000, 16);
