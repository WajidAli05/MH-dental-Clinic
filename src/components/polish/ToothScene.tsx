"use client";

import { memo, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { useTooth } from "@/three/teeth";

// A stain tint multiplied over the natural enamel colours; polishing fades it to white.
const STAIN = new THREE.Color("#f6edd6");
const CLEAN = new THREE.Color("#ffffff");

function Tooth({ progress, holding }: { progress: React.RefObject<number>; holding: React.RefObject<boolean> }) {
  const geo = useTooth("molar");
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const spin = useRef(0.2);

  useFrame((_, dt) => {
    const p = progress.current ?? 0;
    const m = mat.current;
    if (m) {
      // Clearcoat and sheen never touch zero: crossing zero flips shader defines and forces a
      // recompile, which stalls the main thread right in the middle of the hold.
      m.color.copy(STAIN).lerp(CLEAN, p);
      m.roughness = 0.62 - 0.5 * p;
      m.clearcoat = 0.02 + 0.98 * p;
      m.sheen = 0.04 + 0.36 * (1 - p);
    }
    const wanted = holding.current ? 1.6 : 0.22;
    spin.current += (wanted - spin.current) * Math.min(1, dt * 3);
    if (mesh.current) {
      mesh.current.rotation.y += spin.current * dt;
      mesh.current.rotation.x = Math.sin(performance.now() / 2600) * 0.08 + 0.12;
    }
  });

  return (
    <mesh ref={mesh} geometry={geo} scale={1.32} position={[0, 0.12, 0]}>
      <meshPhysicalMaterial
        ref={mat}
        color={STAIN}
        vertexColors
        roughness={0.6}
        metalness={0}
        clearcoat={0.02}
        clearcoatRoughness={0.08}
        sheen={0.4}
        sheenColor="#fff4dc"
        transmission={0}
        thickness={0.6}
        ior={1.5}
      />
    </mesh>
  );
}

function Glints({ progress }: { progress: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.scale.setScalar(0.001 + (progress.current ?? 0));
  });
  return (
    <group ref={group}>
      <Sparkles count={40} scale={[2.6, 2.6, 2.6]} size={3.2} speed={0.4} color="#ffffff" opacity={0.9} />
    </group>
  );
}

/** Compile every shader up front (after the environment map lands), so the first press never stalls. */
function Precompile() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const id = window.setTimeout(() => {
      gl.compileAsync(scene, camera).catch(() => gl.compile(scene, camera));
    }, 300);
    return () => clearTimeout(id);
  }, [gl, scene, camera]);
  return null;
}

// Memoised: the hold button's state changes must never re-render the Canvas, or the
// environment map is rebuilt and every material recompiles mid-press.
export default memo(ToothScene);

function ToothScene({
  progress,
  holding,
  active,
}: {
  progress: React.RefObject<number>;
  holding: React.RefObject<boolean>;
  active: boolean;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.35, 4.2], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 2]} intensity={1.6} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.2} position={[0, 4, 3]} scale={[8, 3, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-4, 1, 2]} scale={[2, 6, 1]} color="#cfeeea" />
        <Lightformer intensity={1.2} position={[4, 0, -2]} scale={[2, 6, 1]} color="#9fd3cf" />
      </Environment>
      <Suspense fallback={null}>
        <Tooth progress={progress} holding={holding} />
      </Suspense>
      <Glints progress={progress} />
      <Precompile />
    </Canvas>
  );
}
