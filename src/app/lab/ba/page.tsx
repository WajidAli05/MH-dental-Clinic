"use client";

// TEMPORARY render page: stages each before/after case on the realistic dental model so
// scripts/render-ba.mjs can capture perfectly aligned image pairs. Delete before launch.
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { archLayout, enamel, gumMaterial, studioEnvironment, useGum, useToothRaw, type ArchTooth, type ToothKind } from "@/three/teeth";

type Case = "whitening" | "scaling" | "filling" | "braces";

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = studioEnvironment(gl);
  }, [gl, scene]);
  return null;
}

function rng(seed: number) {
  let v = seed >>> 0;
  return () => (v = (v * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function Smile({ c, after }: { c: Case; after: boolean }) {
  const layout = useMemo(() => archLayout(6), []);
  const geos: Record<ToothKind, THREE.BufferGeometry> = {
    molar: useToothRaw("molar", true),
    premolar: useToothRaw("premolar", true),
    canine: useToothRaw("canine", true),
    incisor: useToothRaw("incisor", true),
  };
  const upperGum = useGum("upper");
  const lowerGum = useGum("upper"); // full collars on both jaws for these close-ups
  const white = useMemo(() => enamel("#ffffff"), []);
  const stained = useMemo(() => enamel("#d9c58f"), []);
  const gum = useMemo(() => gumMaterial(), []);
  const angry = useMemo(() => {
    const m = gumMaterial();
    m.color.set("#e48e98"); // multiplied over the gum colours: redder, irritated
    return m;
  }, []);
  const tartar = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a98446", roughness: 0.95 }), []);

  const toothMat = c === "whitening" && !after ? stained : white;
  const gumMat = c === "scaling" && !after ? angry : gum;

  // Crowding for the "before" of braces: seeded twists and shifts on the front teeth.
  const crowd = useMemo(() => {
    const r = rng(7);
    return layout.map((t) =>
      c === "braces" && !after && (t.kind === "incisor" || t.kind === "canine")
        ? { ry: (r() - 0.5) * 1.6, dz: (r() - 0.5) * 0.34, dx: (r() - 0.5) * 0.08, dy: (r() - 0.5) * 0.06 }
        : { ry: 0, dz: 0, dx: 0, dy: 0 },
    );
  }, [layout, c, after]);

  const jaw = (upper: boolean) => (
    <group position={[0, upper ? 0.43 : -0.43, 0]} scale={upper ? [1.05, -1, 1.05] : 1}>
      <mesh geometry={upper ? upperGum : lowerGum} material={gumMat} />
      {layout.map((t: ArchTooth, i) => (
        <group key={i} position={[t.position.x + crowd[i].dx, crowd[i].dy, t.position.z + crowd[i].dz]} rotation={[0, t.rotationY + crowd[i].ry, 0]}>
          <group rotation={[t.tilt, 0, 0]} scale={t.scale}>
            <mesh geometry={geos[t.kind]} material={toothMat} />
            {c === "scaling" && !after && !upper && t.kind !== "molar" && (
              // Tartar deposits hugging the gum line on the lip side.
              <mesh material={tartar} position={[0, 0.06, t.kind === "incisor" ? 0.095 : 0.145]} scale={[0.16 * (t.kind === "incisor" ? 1 : 1.2), 0.075, 0.05]}>
                <sphereGeometry args={[1, 24, 12]} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </group>
  );

  return (
    <group position={[0, 0, -0.75]}>
      {jaw(true)}
      {jaw(false)}
    </group>
  );
}

function Molar({ after }: { after: boolean }) {
  const g = useToothRaw("molar", true);
  const m = useMemo(() => enamel("#fbf7ef"), []);
  // Plain materials here: these spheres carry no baked vertex colours.
  const decay = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4a2c16", roughness: 0.9 }), []);
  const decayEdge = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8a6a3e", roughness: 0.9, transparent: true, opacity: 0.7 }), []);
  const fill = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#efe6d2", roughness: 0.25, clearcoat: 0.8 }), []);
  return (
    <group rotation={[0, 0.5, 0]} scale={2.3} position={[0, -0.62, 0]}>
      <mesh geometry={g} material={m} />
      {after ? (
        // A tooth-coloured filling following the central groove.
        <mesh material={fill} position={[0.005, 0.372, 0.0]} scale={[0.12, 0.018, 0.085]}>
          <sphereGeometry args={[1, 32, 16]} />
        </mesh>
      ) : (
        <>
          {/* Decay spreading from the central groove: a stained halo with a dark core. */}
          <mesh material={decayEdge} position={[0.005, 0.371, 0.0]} scale={[0.125, 0.017, 0.09]}>
            <sphereGeometry args={[1, 32, 16]} />
          </mesh>
          <mesh material={decay} position={[0.01, 0.373, 0.005]} scale={[0.075, 0.017, 0.055]}>
            <sphereGeometry args={[1, 32, 16]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Keep the camera aimed at a point (R3F may reset the initial lookAt). */
function Aim({ y }: { y: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, y]);
  return null;
}
export default function BaLab() {
  const [p, setP] = useState<{ c: Case; after: boolean } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setP({ c: (q.get("case") as Case) ?? "whitening", after: q.get("state") === "after" });
  }, []);
  if (!p) return null;
  const top = p.c === "filling";
  return (
    <div id="ba" style={{ width: 1200, height: 900, background: "radial-gradient(ellipse at 50% 45%, #f4f5f2, #d9ddd8)" }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        dpr={1.5}
        camera={top ? { position: [0, 2.9, 0.75], fov: 30 } : { position: [0, 0.0, 3.35], fov: 30 }}
      >
        <Env />
        <Aim y={top ? 0.2 : 0} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[2, 4, 5]} intensity={1.3} />
        <directionalLight position={[-3, 1, 3]} intensity={0.5} color="#fff1e6" />
        <Suspense fallback={null}>{top ? <Molar after={p.after} /> : <Smile c={p.c} after={p.after} />}</Suspense>
      </Canvas>
    </div>
  );
}
