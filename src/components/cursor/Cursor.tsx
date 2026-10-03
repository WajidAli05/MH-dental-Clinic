"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { Dict } from "@/content/en";
import { Fluid } from "./fluid";
import s from "./Cursor.module.css";

/**
 * The cursor layer:
 * - a water simulation that the pointer stirs and clicks splash
 * - a dot plus a trailing ring that becomes a label pill over interactive things
 * - a watery distortion on any [data-liquid] heading while it is hovered
 * Only for fine pointers with motion allowed. Everyone else keeps their normal cursor.
 */
export default function Cursor({ labels }: { labels: Dict["cursor"] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const bursts = useRef<HTMLDivElement>(null);
  const turb = useRef<SVGFETurbulenceElement>(null);
  const disp = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    document.documentElement.classList.add("has-cursor");

    const fluid = canvas.current ? Fluid.create(canvas.current) : null;
    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y,
      lastX = x,
      lastY = y;
    let visible = false;
    let lastMove = 0;
    let raf = 0;
    let last = performance.now();
    let mode = "";

    const setMode = (m: string, text = "") => {
      if (m === mode && (label.current?.textContent ?? "") === text) return;
      mode = m;
      ring.current!.dataset.mode = m;
      dot.current!.dataset.mode = m;
      if (label.current) label.current.textContent = text;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const k = 1 - Math.pow(0.0008, dt); // frame-rate independent trailing
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      dot.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.current!.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (fluid) {
        const dx = x - lastX;
        const dy = y - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) {
          fluid.splat(x / innerWidth, 1 - y / innerHeight, (dx / innerWidth) * 5200, (-dy / innerHeight) * 5200, 1);
        }
        // Keep simulating a few seconds after the last move so the water settles, then rest.
        if (now - lastMove < 4500) fluid.step(dt);
      }
      lastX = x;
      lastY = y;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      lastMove = performance.now();
      if (!visible) {
        visible = true;
        rx = x;
        ry = y;
        lastX = x;
        lastY = y;
        ring.current!.classList.add(s.on);
        dot.current!.classList.add(s.on);
      }
      const t = e.target as HTMLElement;
      const tagged = t.closest<HTMLElement>("[data-cursor]");
      if (tagged) {
        const kind = tagged.dataset.cursor as keyof Dict["cursor"];
        setMode("label", tagged.dataset.cursorLabel || labels[kind] || "");
      } else if (t.closest("input, textarea, select")) setMode("text");
      else if (t.closest("a, button, summary, [role=button], label")) setMode("link");
      else setMode("");
    };
    const onLeave = () => {
      visible = false;
      ring.current!.classList.remove(s.on);
      dot.current!.classList.remove(s.on);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ring.current!.classList.add(s.down);
      // A splash in the water and a ring of droplets.
      if (fluid) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          fluid.splat(x / innerWidth, 1 - y / innerHeight, Math.cos(a) * 900, Math.sin(a) * 900, 1.6, 0.0012);
        }
        lastMove = performance.now();
      }
      const b = document.createElement("div");
      b.className = s.burst;
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      for (let i = 0; i < 8; i++) {
        const d = document.createElement("i");
        d.style.setProperty("--a", `${i * 45}deg`);
        b.appendChild(d);
      }
      bursts.current!.appendChild(b);
      setTimeout(() => b.remove(), 900);
    };
    const onUp = () => ring.current!.classList.remove(s.down);

    // Watery headings: one shared SVG filter, applied to whichever heading is hovered.
    const liquid = { scale: 0, freq: 0.012 };
    let liquidEl: HTMLElement | null = null;
    let liquidTween: gsap.core.Tween | null = null;
    let flow = 0;
    const flowTick = () => {
      flow += 0.016;
      turb.current?.setAttribute("baseFrequency", `${(liquid.freq + Math.sin(flow) * 0.002).toFixed(4)} ${(liquid.freq * 2.4).toFixed(4)}`);
      disp.current?.setAttribute("scale", liquid.scale.toFixed(1));
    };
    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-liquid]");
      if (!el || el === liquidEl) return;
      if (liquidEl) liquidEl.style.filter = "";
      liquidEl = el;
      el.style.filter = "url(#liquid)";
      liquidTween?.kill();
      gsap.ticker.add(flowTick);
      liquidTween = gsap.fromTo(liquid, { scale: 0 }, { scale: 26, duration: 0.5, ease: "power2.out" });
    };
    const onOut = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-liquid]");
      const to = (e as MouseEvent).relatedTarget as Node | null;
      if (!el || el !== liquidEl || (to && el.contains(to))) return;
      liquidTween?.kill();
      liquidTween = gsap.to(liquid, {
        scale: 0,
        duration: 0.9,
        ease: "power3.out",
        onComplete: () => {
          if (liquidEl === el) {
            el.style.filter = "";
            liquidEl = null;
          }
          gsap.ticker.remove(flowTick);
        },
      });
    };

    const onResize = () => fluid?.resize();
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown);
    addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      removeEventListener("resize", onResize);
      gsap.ticker.remove(flowTick);
      fluid?.dispose();
      document.documentElement.classList.remove("has-cursor");
    };
  }, [labels]);

  return (
    <>
      <svg className={s.defs} aria-hidden="true">
        <filter id="liquid" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap ref={disp} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <canvas ref={canvas} className={s.fluid} aria-hidden="true" />
      <div ref={bursts} className={s.bursts} aria-hidden="true" />
      <div ref={ring} className={s.ring} aria-hidden="true">
        <span ref={label} className={s.label} />
      </div>
      <div ref={dot} className={s.dot} aria-hidden="true" />
    </>
  );
}
