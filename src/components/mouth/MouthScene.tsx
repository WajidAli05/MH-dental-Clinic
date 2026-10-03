"use client";

import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { archLayout, enamel, gumMaterial, studioEnvironment, useGum, useToothRaw, type ArchTooth, type ToothKind } from "@/three/teeth";

export type Bridge = {
  stage: HTMLElement | null;
  dots: Map<string, HTMLElement>;
  cord: SVGPathElement | null;
  card: HTMLElement | null;
  active: string | null;
  drag: { x: number; down: boolean };
};

type Hotspot = { id: string; at: THREE.Vector3; normal: THREE.Vector3 };

// Jaw placement in arch units (cervical line of each jaw at its y). The mouth is slightly open.
const LOWER_Y = -0.5;
const UPPER_Y = 0.5;
const UPPER_SCALE = 1.05; // the upper arch sits just outside the lower one, like a real bite
// How far the lip/cheek face of each crown sits from the tooth axis.
const FACE: Record<ToothKind, number> = { incisor: 0.11, canine: 0.17, premolar: 0.19, molar: 0.25 };

const outward = (t: ArchTooth) => new THREE.Vector3(Math.sin(t.rotationY), 0, Math.cos(t.rotationY));

function Jaw({
  upper,
  layout,
  geos,
}: {
  upper: boolean;
  layout: ArchTooth[];
  geos: Record<ToothKind, THREE.BufferGeometry>;
}) {
  const gum = useGum(upper ? "upper" : "lower");
  const enamelMat = useMemo(() => enamel(), []);
  const stained = useMemo(() => enamel("#d8c48e"), []);
  const decay = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2618", roughness: 0.85 }), []);
  const gumMat = useMemo(() => gumMaterial(), []);
  const inflamed = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d4505f", roughness: 0.5, clearcoat: 0.4, transparent: true, opacity: 0.5, depthWrite: false }), []);

  return (
    <group position={[0, upper ? UPPER_Y : LOWER_Y, 0]} scale={upper ? [UPPER_SCALE, -1, UPPER_SCALE] : 1}>
      <mesh geometry={gum} material={gumMat} />
      {layout.map((t, i) => {
        // The lower first molar on one side is missing: the "gap" story.
        if (!upper && t.name === "molar1" && t.side === -1) return null;
        const tartar = !upper && (t.name === "central" || t.name === "lateral");
        const impacted = !upper && t.name === "wisdom" && t.side === 1;
        return (
          <group key={i} position={[t.position.x, impacted ? -0.16 : 0, t.position.z]} rotation={[0, t.rotationY, 0]}>
            <group rotation={[t.tilt, 0, impacted ? -0.6 : 0]} scale={t.scale}>
              <mesh geometry={geos[t.kind]} material={tartar ? stained : enamelMat} />
              {upper && t.name === "premolar1" && t.side === 1 && (
                <mesh material={decay} position={[0.02, 0.37, 0.02]} scale={[0.045, 0.02, 0.04]}>
                  <sphereGeometry args={[1, 16, 8]} />
                </mesh>
              )}
              {upper && t.name === "molar1" && t.side === -1 && (
                <mesh material={decay} position={[0.03, 0.38, 0.03]} scale={[0.09, 0.03, 0.08]}>
                  <sphereGeometry args={[1, 16, 8]} />
                </mesh>
              )}
            </group>
          </group>
        );
      })}
      {upper &&
        (() => {
          const t = layout.find((q) => q.name === "lateral" && q.side === 1)!;
          const p = t.position.clone().addScaledVector(outward(t), 0.3);
          return (
            <mesh material={inflamed} position={[p.x, 0.04, p.z]} rotation={[0, t.rotationY, 0]} scale={[0.14, 0.06, 0.035]}>
              <sphereGeometry args={[1, 24, 12]} />
            </mesh>
          );
        })()}
      {!upper && (
        // The tongue, resting inside the lower arch.
        <mesh position={[0, 0.02, -0.42]} scale={[0.82, 0.22, 1.05]}>
          <sphereGeometry args={[1, 48, 24]} />
          <meshPhysicalMaterial color="#d46672" roughness={0.55} clearcoat={0.3} sheen={0.6} sheenColor="#ffc1c8" />
        </mesh>
      )}
    </group>
  );
}

function Mouth({ bridge }: { bridge: React.RefObject<Bridge> }) {
  const group = useRef<THREE.Group>(null);
  const layout = useMemo(() => archLayout(8), []);
  const geos: Record<ToothKind, THREE.BufferGeometry> = {
    molar: useToothRaw("molar", true),
    premolar: useToothRaw("premolar", true),
    canine: useToothRaw("canine", true),
    incisor: useToothRaw("incisor", true),
  };
  const { camera } = useThree();

  // Hotspot anchors in mouth space: on the lip/cheek face of the tooth that tells each story.
  const spots = useMemo<Hotspot[]>(() => {
    const find = (name: ArchTooth["name"], side: -1 | 1) => layout.find((t) => t.name === name && t.side === side)!;
    const onTooth = (id: string, upper: boolean, t: ArchTooth, height = 0.2, push = FACE[t.kind]) => {
      const n = outward(t);
      const k = upper ? UPPER_SCALE : 1;
      const y = upper ? UPPER_Y - height : LOWER_Y + height;
      return { id, normal: n, at: new THREE.Vector3(t.position.x * k, y, t.position.z * k).addScaledVector(n, push * k) };
    };
    return [
      onTooth("front", true, find("central", -1), 0.24),
      onTooth("canine", true, find("canine", 1), 0.24),
      onTooth("premolar", true, find("premolar1", 1), 0.24),
      onTooth("molar", true, find("molar1", -1), 0.22),
      onTooth("wisdom", false, find("wisdom", 1), 0.08),
      onTooth("tartar", false, find("central", 1), 0.12),
      onTooth("gap", false, find("molar1", -1), 0.04, 0),
      onTooth("gums", true, find("lateral", 1), -0.07, 0.3),
    ];
  }, [layout]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const n = useMemo(() => new THREE.Vector3(), []);
  const rot = useRef({ y: 0, vy: 0 });
  const last = useRef({ path: "" });

  useFrame((st, dt) => {
    const g = group.current;
    const b = bridge.current;
    if (!g || !b) return;

    // Drag to turn, with momentum; otherwise ease (never spring) into a gentle sway.
    const r = rot.current;
    if (b.drag.down) {
      r.vy = b.drag.x * 0.008;
      b.drag.x = 0;
      r.y += r.vy;
    } else {
      r.vy *= Math.pow(0.02, dt);
      const sway = Math.sin(st.clock.elapsedTime * 0.3) * 0.18;
      r.y += r.vy + (sway - r.y) * Math.min(1, dt * 0.8);
    }
    r.y = THREE.MathUtils.clamp(r.y, -1.1, 1.1);
    g.rotation.y = r.y;
    g.updateMatrixWorld();

    const stage = b.stage;
    if (!stage) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    camera.getWorldDirection(camDir);
    for (const sp of spots) {
      const el = b.dots.get(sp.id);
      if (!el) continue;
      tmp.copy(sp.at);
      g.localToWorld(tmp);
      n.copy(sp.normal).transformDirection(g.matrixWorld);
      const facing = -n.dot(camDir);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = facing < -0.1 ? "0.3" : "1";
      el.dataset.x = x.toFixed(1);
      el.dataset.y = y.toFixed(1);
    }

    if (b.cord) {
      let d = "";
      const dot = b.active ? b.dots.get(b.active) : null;
      if (dot && b.card) {
        const sx = Number(dot.dataset.x);
        const sy = Number(dot.dataset.y);
        const sr = stage.getBoundingClientRect();
        const cr = b.card.getBoundingClientRect();
        const cx0 = cr.left - sr.left;
        const cy0 = cr.top - sr.top;
        let ex: number, ey: number;
        if (sx < cx0) [ex, ey] = [cx0, cy0 + Math.min(cr.height / 2, 60)];
        else if (sx > cx0 + cr.width) [ex, ey] = [cx0 + cr.width, cy0 + Math.min(cr.height / 2, 60)];
        else [ex, ey] = [cx0 + cr.width / 2, sy < cy0 ? cy0 : cy0 + cr.height];
        const mx = (sx + ex) / 2;
        d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${mx.toFixed(1)} ${(sy - 40).toFixed(1)}, ${mx.toFixed(1)} ${(ey + 40).toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      }
      if (d !== last.current.path) {
        last.current.path = d;
        b.cord.setAttribute("d", d);
      }
    }
  });

  return (
    // Seen almost head-on at tooth level, like a real smile, centred on the arch.
    <group rotation={[0.12, 0, 0]}>
      <group ref={group} scale={0.47} position={[0, 0.1, 0]}>
        <group position={[0, 0, 0.3]}>
          <Jaw upper layout={layout} geos={geos} />
          <Jaw upper={false} layout={layout} geos={geos} />
        </group>
      </group>
    </group>
  );
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = studioEnvironment(gl);
  }, [gl, scene]);
  return null;
}

function MouthScene({ bridge, active }: { bridge: React.RefObject<Bridge>; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.1, 3.3], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
    >
      <Env />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 4]} intensity={1.3} />
      <directionalLight position={[-3, -1, 2]} intensity={0.45} color="#ffe2e6" />
      <Suspense fallback={null}>
        <Mouth bridge={bridge} />
      </Suspense>
    </Canvas>
  );
}

export default memo(MouthScene);
