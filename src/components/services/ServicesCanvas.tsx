"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { gsap } from "gsap";

/**
 * One fixed, transparent, click-through canvas that renders every <View> on the page.
 * It is advanced from GSAP's ticker, after the smooth scroller has moved the page,
 * so the 3D never trails its card by a frame while scrolling.
 */
function TickerDriver({ active }: { active: boolean }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    if (!active) return;
    // R3F's advance() takes the timestamp in SECONDS when frameloop is "never".
    // Passing milliseconds made every frame look like ~16 s had passed, so models spun wildly.
    const tick = () => advance(performance.now() / 1000);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active, advance]);
  return null;
}

export default function ServicesCanvas({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop="never"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.4, 4.3], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 30 }}
      aria-hidden="true"
    >
      <TickerDriver active={active} />
      <View.Port />
    </Canvas>
  );
}
