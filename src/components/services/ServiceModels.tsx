"use client";

/*
 * One small animated 3D vignette per treatment, all built from the realistic baked teeth
 * (see @/three/teeth). They sit inside drei <View>s on one fixed canvas.
 * `hot` is a ref the card writes on hover; models play their story a little faster when hot.
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Sparkles } from "@react-three/drei";
import {
  archLayout,
  enamel,
  gumMaterial,
  implantScrewGeometry,
  metal,
  useGum,
  useTooth,
  useToothRaw,
  type ArchTooth,
  type ToothKind,
} from "@/three/teeth";

export type Hot = React.RefObject<boolean>;
const STAIN = new THREE.Color("#d8c38f");
const CLEAN = new THREE.Color("#ffffff");

/** Shared turntable: a calm idle turn, a little livelier while hovered, gentle bob. */
function useTurntable(hot: Hot, base = 0.22) {
  const g = useRef<THREE.Group>(null);
  const speed = useRef(base);
  useFrame((st, dt) => {
    if (!g.current) return;
    const want = hot.current ? base * 2.2 : base;
    speed.current += (want - speed.current) * Math.min(1, dt * 2.5);
    g.current.rotation.y += speed.current * dt;
    g.current.position.y = Math.sin(st.clock.elapsedTime * 1.1) * 0.035;
  });
  return g;
}

const loop = (t: number, period: number) => (t % period) / period;
const ease = (x: number) => x * x * (3 - 2 * x);

function plainGum() {
  return new THREE.MeshPhysicalMaterial({ color: "#e07c86", roughness: 0.45, clearcoat: 0.5, sheen: 0.6, sheenColor: new THREE.Color("#ffc8cf") });
}

function Molar({ material, scale = 1.35, roots = true }: { material: THREE.Material; scale?: number; roots?: boolean }) {
  const geo = useTooth("molar", { roots });
  return <mesh geometry={geo} material={material} scale={scale} />;
}

/* 1. Checkup: a dental mirror orbits the tooth. */
export function Checkup({ hot }: { hot: Hot }) {
  const g = useTurntable(hot, 0.15);
  const mat = useMemo(() => enamel(), []);
  const steel = useMemo(() => metal("#d9dde2", 0.18), []);
  const mirror = useMemo(() => metal("#ffffff", 0.02), []);
  const orbit = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.y -= dt * (hot.current ? 1.1 : 0.5);
  });
  return (
    <group ref={g}>
      <Molar material={mat} />
      <group ref={orbit}>
        <group position={[0.75, 0.45, 0]} rotation={[0, 0, 0.55]}>
          <mesh material={steel} position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.1, 16]} />
          </mesh>
          <mesh material={mirror} rotation={[0, 0, Math.PI / 2]} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 40]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* 2. Scaling: a tartar band clears as the scaler passes, then the tooth sparkles. */
export function Scaling({ hot }: { hot: Hot }) {
  const g = useTurntable(hot);
  const mat = useMemo(() => enamel(), []);
  const tartar = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9a85a", roughness: 0.9, transparent: true }), []);
  const ring = useRef<THREE.Mesh>(null);
  const tool = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Group>(null);
  const steel = useMemo(() => metal("#cfd3d8", 0.25), []);
  useFrame((st) => {
    const t = loop(st.clock.elapsedTime * (hot.current ? 1.4 : 1), 5);
    const clean = ease(THREE.MathUtils.clamp((t - 0.2) / 0.45, 0, 1));
    const back = t > 0.9 ? (t - 0.9) / 0.1 : 0;
    const amount = Math.max(1 - clean, back);
    if (ring.current) ring.current.scale.setScalar(0.85 + 0.15 * amount);
    tartar.opacity = amount;
    mat.color.copy(STAIN).lerp(CLEAN, 1 - amount * 0.7);
    if (tool.current) tool.current.rotation.y = t * Math.PI * 4;
    if (spark.current) spark.current.scale.setScalar(0.01 + (1 - amount));
  });
  return (
    <group ref={g}>
      <Molar material={mat} />
      <mesh ref={ring} material={tartar} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.82, 1]}>
        <torusGeometry args={[0.33, 0.05, 16, 48]} />
      </mesh>
      <group ref={tool}>
        <mesh material={steel} position={[0.55, 0.62, 0]} rotation={[0, 0, -0.9]}>
          <cylinderGeometry args={[0.02, 0.01, 0.8, 12]} />
        </mesh>
      </group>
      <group ref={spark}>
        <Sparkles count={18} scale={1.8} size={3} speed={0.5} color="#ffffff" />
      </group>
    </group>
  );
}

/* 3. Filling: a tooth-coloured inlay set into the biting surface, glowing under the curing light. */
export function Filling({ hot }: { hot: Hot }) {
  const g = useTurntable(hot);
  const mat = useMemo(() => enamel(), []);
  const inlay = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#d9f3ef", emissive: "#3fc8bd", emissiveIntensity: 0.6, roughness: 0.15, clearcoat: 1 }),
    [],
  );
  useFrame((st) => {
    inlay.emissiveIntensity = 0.2 + (Math.sin(st.clock.elapsedTime * (hot.current ? 4 : 2)) * 0.5 + 0.5) * 0.8;
  });
  return (
    <group ref={g} rotation={[0.5, 0, 0]}>
      <Molar material={mat} />
      <mesh material={inlay} position={[0, 0.55, 0]} scale={[0.2, 0.05, 0.15]}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <pointLight position={[0, 1.3, 0.4]} color="#5fe6dc" intensity={3} distance={3} />
    </group>
  );
}

/* 4. Root canal: a clear tooth with the canals glowing inside its real roots. */
export function RootCanal({ hot }: { hot: Hot }) {
  const g = useTurntable(hot, 0.2);
  const raw = useToothRaw("molar");
  const glass = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#a9dcd6", roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false }),
    [],
  );
  const canal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ff5a6a", emissive: "#e0243a", emissiveIntensity: 1.4 }), []);
  // Pulp chamber down each root, in the tooth's own units (cervical line at y = 0).
  const tubes = useMemo(() => {
    const mk = (pts: [number, number][]) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0))), 40, 0.026, 8);
    return [
      mk([[0, 0.17], [-0.06, 0.02], [-0.12, -0.2], [-0.15, -0.58]]),
      mk([[0, 0.17], [0.06, 0.02], [0.11, -0.2], [0.115, -0.53]]),
    ];
  }, []);
  useFrame((st) => {
    const healed = ease(Math.sin(st.clock.elapsedTime * (hot.current ? 1.3 : 0.6)) * 0.5 + 0.5);
    canal.emissive.set("#e0243a").lerp(new THREE.Color("#3fc8bd"), healed);
    canal.color.set("#ff5a6a").lerp(new THREE.Color("#9ff0ea"), healed);
  });
  return (
    <group ref={g}>
      <group scale={1.28} position={[0, 0.16, 0]}>
        {tubes.map((t, i) => (
          <mesh key={i} geometry={t} material={canal} />
        ))}
        <mesh geometry={raw} material={glass} />
      </group>
    </group>
  );
}

function GumBlock({ w = 1.6 }: { w?: number }) {
  const mat = useMemo(() => plainGum(), []);
  return <RoundedBox args={[w, 0.5, 0.8]} radius={0.22} smoothness={6} position={[0, -0.55, 0]} material={mat} />;
}

/* 5. Extraction: the tooth lifts gently out of the gum, then settles back. */
export function Extraction({ hot }: { hot: Hot }) {
  const g = useRef<THREE.Group>(null);
  const tooth = useRef<THREE.Group>(null);
  const mat = useMemo(() => enamel(), []);
  useFrame((st, dt) => {
    if (g.current) g.current.rotation.y += dt * (hot.current ? 0.45 : 0.2);
    const t = loop(st.clock.elapsedTime * (hot.current ? 1.3 : 1), 4.2);
    const lift = t < 0.5 ? ease(t / 0.5) : 1 - ease((t - 0.5) / 0.5);
    if (tooth.current) {
      tooth.current.position.y = -0.22 + lift * 0.6;
      tooth.current.rotation.z = Math.sin(t * Math.PI * 6) * 0.06 * lift;
    }
  });
  return (
    <group ref={g}>
      <GumBlock w={1.3} />
      <group ref={tooth}>
        <Molar material={mat} scale={1.05} />
      </group>
    </group>
  );
}

/* 6. Crowns: the real crown shape lowers onto the prepared tooth and settles home. */
export function Crowns({ hot }: { hot: Hot }) {
  const g = useTurntable(hot);
  const full = useToothRaw("molar");
  const crown = useToothRaw("molar", true);
  const stump = useMemo(() => enamel("#eadbbd"), []);
  const cap = useMemo(() => enamel("#ffffff"), []);
  const capRef = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const t = loop(st.clock.elapsedTime * (hot.current ? 1.4 : 1), 4);
    const down = t < 0.55 ? ease(t / 0.55) : 1;
    const up = t > 0.8 ? ease((t - 0.8) / 0.2) : 0;
    if (capRef.current) capRef.current.position.y = 0.02 + (1 - down) * 0.38 + up * 0.38;
  });
  return (
    <group ref={g}>
      <group scale={1.25} position={[0, 0.02, 0]}>
        {/* The prepared tooth: the same tooth, trimmed slimmer under the crown */}
        <mesh geometry={full} material={stump} scale={[0.8, 0.94, 0.8]} />
        <mesh ref={capRef} geometry={crown} material={cap} scale={1.03} />
      </group>
    </group>
  );
}

/* 7. Bridge: a new tooth held between its two neighbours. */
export function Bridge({ hot }: { hot: Hot }) {
  const g = useTurntable(hot, 0.18);
  const crown = useToothRaw("molar", true);
  const mat = useMemo(() => enamel(), []);
  const pontic = useMemo(() => enamel("#ffffff"), []);
  const mid = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (mid.current) mid.current.position.y = -0.18 + Math.abs(Math.sin(st.clock.elapsedTime * (hot.current ? 2 : 1))) * 0.1;
  });
  return (
    <group ref={g} scale={0.95}>
      <GumBlock w={2} />
      <mesh geometry={crown} material={mat} position={[-0.6, -0.28, 0]} />
      <mesh geometry={crown} material={mat} position={[0.6, -0.28, 0]} />
      <mesh ref={mid} geometry={crown} material={pontic} />
      <mesh material={mat} position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 12]} />
      </mesh>
    </group>
  );
}

/** All four crown shapes, fetched up front (hooks cannot run inside a loop). */
function useCrowns(): Record<ToothKind, THREE.BufferGeometry> {
  return {
    molar: useToothRaw("molar", true),
    premolar: useToothRaw("premolar", true),
    canine: useToothRaw("canine", true),
    incisor: useToothRaw("incisor", true),
  };
}

function ArchTeeth({ layout, geos, material }: { layout: ArchTooth[]; geos: Record<ToothKind, THREE.BufferGeometry>; material: THREE.Material }) {
  return (
    <>
      {layout.map((t, i) => (
        <group key={i} position={t.position} rotation={[0, t.rotationY, 0]}>
          <mesh geometry={geos[t.kind]} material={material} rotation={[t.tilt, 0, 0]} scale={t.scale} />
        </group>
      ))}
    </>
  );
}

/* 8. Dentures: a full arch of teeth standing in a scalloped gum. */
export function Dentures({ hot }: { hot: Hot }) {
  const g = useTurntable(hot, 0.18);
  const geos = useCrowns();
  const gum = useGum("upper"); // baked crowns-up, with every collar: right for a full denture
  const mat = useMemo(() => enamel(), []);
  const gumMat = useMemo(() => gumMaterial(), []);
  const layout = useMemo(() => archLayout(7), []);
  return (
    <group ref={g}>
      <group rotation={[0.62, 0, 0]} scale={0.5} position={[0, -0.1, 0.05]}>
        <mesh geometry={gum} material={gumMat} />
        <ArchTeeth layout={layout} geos={geos} material={mat} />
      </group>
    </group>
  );
}

/* 9. Braces: brackets on the front teeth, threaded on a wire. */
export function Braces({ hot }: { hot: Hot }) {
  const g = useRef<THREE.Group>(null);
  const geos = useCrowns();
  const mat = useMemo(() => enamel(), []);
  const steel = useMemo(() => metal("#dfe3e8", 0.15), []);
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3fc8bd", roughness: 0.4 }), []);
  const layout = useMemo(() => archLayout(3), []);
  // Where each bracket sits on the lip-side face, in arch space, so the wire can pass through.
  const { brackets, wire } = useMemo(() => {
    const m = new THREE.Matrix4();
    const pts = layout
      .map((t) => {
        const face = t.kind === "canine" ? 0.15 : 0.085;
        const local = new THREE.Vector3(0, 0.2 * t.scale, face * t.scale + 0.012);
        m.compose(t.position, new THREE.Quaternion().setFromEuler(new THREE.Euler(t.tilt, t.rotationY, 0, "YXZ")), new THREE.Vector3(1, 1, 1));
        return { t, p: local.applyMatrix4(m) };
      })
      .sort((a, b) => a.p.x - b.p.x);
    return { brackets: pts, wire: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => q.p)), 60, 0.009, 8) };
  }, [layout]);
  useFrame((st) => {
    if (g.current) g.current.rotation.y = Math.sin(st.clock.elapsedTime * (hot.current ? 0.9 : 0.45)) * 0.45;
  });
  return (
    <group ref={g}>
      <group scale={1.05} position={[0, -0.2, -0.85]}>
        {layout.map((t, i) => (
          <group key={i} position={t.position} rotation={[0, t.rotationY, 0]}>
            <mesh geometry={geos[t.kind]} material={mat} rotation={[t.tilt, 0, 0]} scale={t.scale} />
          </group>
        ))}
        {brackets.map(({ t, p }, i) => (
          <group key={i} position={p} rotation={[0, t.rotationY, 0]}>
            <mesh material={steel}>
              <boxGeometry args={[0.07, 0.06, 0.03]} />
            </mesh>
            <mesh material={band} position={[0, 0, 0.012]} rotation={[0, 0, Math.PI / 4]}>
              <torusGeometry args={[0.028, 0.008, 6, 16]} />
            </mesh>
          </group>
        ))}
        <mesh geometry={wire} material={steel} />
      </group>
    </group>
  );
}

/* 10. Whitening: the stain fades to bright white, with a glint. */
export function Whitening({ hot }: { hot: Hot }) {
  const g = useTurntable(hot, 0.2);
  const mat = useMemo(() => enamel(), []);
  const spark = useRef<THREE.Group>(null);
  const geo = useTooth("incisor");
  useFrame((st) => {
    const t = Math.sin(st.clock.elapsedTime * (hot.current ? 1.4 : 0.7)) * 0.5 + 0.5;
    mat.color.copy(STAIN).lerp(CLEAN, ease(t));
    if (spark.current) spark.current.scale.setScalar(0.01 + ease(t));
  });
  return (
    <group ref={g}>
      <mesh geometry={geo} material={mat} scale={1.55} />
      <group ref={spark}>
        <Sparkles count={24} scale={1.8} size={3.5} speed={0.4} color="#ffffff" />
      </group>
    </group>
  );
}

/* 11. Implants: crown, abutment and screw, drawing apart and clicking together. */
export function Implant({ hot }: { hot: Hot }) {
  const g = useTurntable(hot, 0.3);
  const crownMat = useMemo(() => enamel(), []);
  const gold = useMemo(() => metal("#c99a5b", 0.28), []);
  const ti = useMemo(() => metal("#b9bec6", 0.2), []);
  const crown = useTooth("molar", { roots: false });
  const screw = useMemo(() => implantScrewGeometry(), []);
  const top = useRef<THREE.Mesh>(null);
  const mid = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const t = Math.sin(st.clock.elapsedTime * (hot.current ? 1.4 : 0.7)) * 0.5 + 0.5;
    const spread = ease(t) * 0.28;
    if (top.current) top.current.position.y = 0.48 + spread * 1.4;
    if (mid.current) mid.current.position.y = 0.2 + spread * 0.7;
  });
  return (
    <group ref={g} scale={0.86} position={[0, -0.2, 0]}>
      <mesh ref={top} geometry={crown} material={crownMat} scale={0.6} />
      <mesh ref={mid} material={ti}>
        <cylinderGeometry args={[0.1, 0.15, 0.22, 32]} />
      </mesh>
      <mesh geometry={screw} material={gold} position={[0, -0.32, 0]} scale={[1.05, 0.9, 1.05]} />
    </group>
  );
}

/* 12. Kids: a cheerful little tooth that bounces. */
export function Kids({ hot }: { hot: Hot }) {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(() => enamel("#ffffff"), []);
  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: "#14181b", roughness: 0.2 }), []);
  const white = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff" }), []);
  const blush = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff9aa8", transparent: true, opacity: 0.8 }), []);
  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime * (hot.current ? 3.4 : 2);
    const b = Math.abs(Math.sin(t));
    g.current.position.y = b * 0.18 - 0.08;
    g.current.scale.set(1 + (1 - b) * 0.07, 1 - (1 - b) * 0.07, 1);
    g.current.rotation.y = Math.sin(t * 0.4) * 0.45;
  });
  return (
    <group ref={g}>
      <Molar material={mat} scale={1.3} />
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.13, 0.43, 0.3]}>
          <mesh material={black} scale={0.06}>
            <sphereGeometry args={[1, 24, 16]} />
          </mesh>
          <mesh material={white} position={[0.018, 0.022, 0.05]} scale={0.018}>
            <sphereGeometry args={[1, 12, 8]} />
          </mesh>
          <mesh material={blush} position={[sx * 0.08, -0.1, 0.0]} scale={[0.06, 0.035, 0.01]}>
            <sphereGeometry args={[1, 16, 8]} />
          </mesh>
        </group>
      ))}
      <mesh material={black} position={[0, 0.33, 0.31]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.08, 0.016, 10, 24, Math.PI]} />
      </mesh>
    </group>
  );
}

export const MODELS: Record<string, (p: { hot: Hot }) => React.JSX.Element> = {
  checkup: Checkup,
  scaling: Scaling,
  filling: Filling,
  rct: RootCanal,
  extraction: Extraction,
  crowns: Crowns,
  bridge: Bridge,
  dentures: Dentures,
  braces: Braces,
  whitening: Whitening,
  implants: Implant,
  kids: Kids,
};
