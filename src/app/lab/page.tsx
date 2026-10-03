"use client";

// TEMPORARY dev page for judging the baked dental meshes. Delete before launch.
import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { enamel, gumMaterial, studioEnvironment, useGum, useTooth, type ToothKind } from "@/three/teeth";

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = studioEnvironment(gl);
  }, [gl, scene]);
  return null;
}

function Tooth({ kind, roots, x }: { kind: ToothKind; roots: boolean; x: number }) {
  const g = useTooth(kind, { roots });
  const m = useMemo(() => enamel(), []);
  return <mesh geometry={g} material={m} position={[x, roots ? 0.6 : -0.6, 0]} scale={roots ? 1 : 0.7} rotation={[0.25, 0.5, 0]} />;
}

function Gum() {
  const g = useGum("lower");
  const m = useMemo(() => gumMaterial(), []);
  return <mesh geometry={g} material={m} position={[0, -1.6, 0]} scale={0.7} rotation={[0.7, 0, 0]} />;
}

export default function Lab() {
  const kinds: ToothKind[] = ["molar", "premolar", "canine", "incisor"];
  return (
    <div style={{ position: "fixed", inset: 0, background: "#eceeea" }}>
      <Canvas camera={{ position: [0, 0, 5.2], fov: 35 }}>
        <Env />
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 5, 4]} intensity={1.3} />
        <directionalLight position={[-3, 1, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          {kinds.map((k, i) => (
            <group key={k}>
              <Tooth kind={k} roots x={-2.1 + i * 1.4} />
              <Tooth kind={k} roots={false} x={-2.1 + i * 1.4} />
            </group>
          ))}
          <Gum />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  );
}
