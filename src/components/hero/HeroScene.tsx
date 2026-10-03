"use client";

import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { studioEnvironment, useTooth } from "@/three/teeth";

export type HeroState = { progress: number; pointerX: number; pointerY: number; reduced: boolean };

/**
 * A porcelain material whose surface ripples like water around a hit point.
 * Displacement moves the vertices; the normal is bent with the same wave so light follows it.
 */
function useRippleMaterial() {
  return useMemo(() => {
    const uniforms = {
      uHit: { value: new THREE.Vector3(0, 0.2, 0.4) },
      uAmp: { value: 0 },
      uTime: { value: 0 },
    };
    // Real enamel: natural colour lives in the vertices (warm neck, ivory roots, cool edge).
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      vertexColors: true,
      roughness: 0.26,
      metalness: 0,
      clearcoat: 0.75,
      clearcoatRoughness: 0.14,
      iridescence: 0.12,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 420],
      sheen: 0.25,
      sheenColor: new THREE.Color("#ffffff"),
    });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform vec3 uHit; uniform float uAmp; uniform float uTime;
           float rippleH(vec3 p){ float d = distance(p, uHit); return sin(d*30.0 - uTime*9.0) * exp(-d*4.2) * uAmp; }`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
           {
             float d = distance(position, uHit);
             vec3 dir = normalize(position - uHit + 1e-5);
             float slope = cos(d*30.0 - uTime*9.0) * 30.0 * exp(-d*4.2) * uAmp;
             objectNormal = normalize(objectNormal - dir * slope * 0.018);
           }`,
        )
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normal * rippleH(position) * 0.022;`);
    };
    return { mat, uniforms };
  }, []);
}

function Tooth({ state }: { state: React.RefObject<HeroState> }) {
  const geo = useTooth("molar");
  const { mat, uniforms } = useRippleMaterial();
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const spinKick = useRef(0);
  const intro = useRef(0);
  const local = useMemo(() => new THREE.Vector3(), []);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!mesh.current) return;
    local.copy(e.point);
    mesh.current.worldToLocal(local);
    uniforms.uHit.value.copy(local);
    uniforms.uAmp.value = Math.min(1, uniforms.uAmp.value + 0.25);
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    onMove(e);
    uniforms.uAmp.value = 1.6;
    spinKick.current += Math.PI * 1.2;
  };

  useFrame((st, dt) => {
    const s = state.current;
    if (!s || !group.current || !mesh.current) return;
    uniforms.uTime.value += dt;
    uniforms.uAmp.value *= Math.pow(0.35, dt); // the water settles
    intro.current = Math.min(1, intro.current + dt / 1.6);
    const k = 1 - Math.pow(1 - intro.current, 4);

    // Scroll: the tooth turns, grows a touch, then lifts away.
    const p = s.progress;
    const spin = spinKick.current * 0.06;
    spinKick.current -= spin;
    mesh.current.rotation.y += dt * (s.reduced ? 0 : 0.25) + spin;
    const targetX = s.pointerY * 0.18 + 0.15;
    const targetZ = -s.pointerX * 0.12;
    group.current.rotation.x += (targetX - group.current.rotation.x) * Math.min(1, dt * 3);
    group.current.rotation.z += (targetZ - group.current.rotation.z) * Math.min(1, dt * 3);
    // Narrow (portrait) screens get a smaller tooth so the poster words still read.
    const fit = THREE.MathUtils.clamp(st.size.width / st.size.height, 0.5, 1.2) / 1.2;
    const scale = (0.6 + 0.4 * k) * (1 + p * 0.35) * (0.45 + 0.55 * fit);
    group.current.scale.setScalar(scale);
    group.current.position.y = (1 - k) * 2.2 - p * 0.9;
    group.current.rotation.y = p * Math.PI * 1.4;
  });

  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geo} material={mat} scale={1.78} onPointerMove={onMove} onPointerDown={onDown} />
    </group>
  );
}

function Bubbles() {
  const glass = useMemo(
    () =>
      // A soap-bubble look without transmission: cheap, and identical on every GPU.
      new THREE.MeshPhysicalMaterial({
        color: "#dff7f4",
        roughness: 0.04,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        clearcoat: 1,
        iridescence: 1,
        iridescenceThicknessRange: [200, 800],
        depthWrite: false,
      }),
    [],
  );
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 48, 48), []);
  const spots: [number, number, number, number][] = [
    [-1.9, 0.9, -0.6, 0.16],
    [1.8, -0.7, 0.3, 0.22],
    [1.4, 1.25, -0.8, 0.1],
    [-1.5, -1.0, 0.5, 0.12],
  ];
  return (
    <>
      {spots.map(([x, y, z, r], i) => (
        <Float key={i} speed={1.2 + i * 0.3} floatIntensity={0.8} rotationIntensity={0.4}>
          <mesh geometry={sphere} material={glass} position={[x, y, z]} scale={r} />
        </Float>
      ))}
    </>
  );
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = studioEnvironment(gl);
  }, [gl, scene]);
  return null;
}

function HeroScene({ state, active }: { state: React.RefObject<HeroState>; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 6.2], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Env />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <directionalLight position={[-4, -2, 2]} intensity={0.5} color="#bff3ee" />
      <Suspense fallback={null}>
        <Tooth state={state} />
      </Suspense>
      <Bubbles />
      <Sparkles count={30} scale={[5, 4, 2]} size={2.4} speed={0.25} color="#3fc8bd" opacity={0.7} />
    </Canvas>
  );
}

export default memo(HeroScene);
