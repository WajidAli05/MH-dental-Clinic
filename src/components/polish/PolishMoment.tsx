"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Dict } from "@/content/en";
import Rich from "@/components/ui/Rich";
import s from "./PolishMoment.module.css";

const ToothScene = dynamic(() => import("./ToothScene"), { ssr: false });

const FILL_SECONDS = 2.4;
const RING = 2 * Math.PI * 46;

/** The one interactive moment: press and hold to polish a stained tooth clean. */
export default function PolishMoment({ t, waHref }: { t: Dict["polish"]; waHref: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const progress = useRef(0);
  const holding = useRef(false);
  const [done, setDone] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [active, setActive] = useState(false);
  const raf = useRef<number | null>(null);

  // Only render the 3D scene while the section is near the viewport. The wide margin lets
  // the one-time shader compile finish before the visitor reaches the button.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "900px 0px" });
    if (rootRef.current) io.observe(rootRef.current);
    return () => io.disconnect();
  }, []);

  // Reduced motion: the final state, no hold required.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) {
        progress.current = 1;
        ringRef.current?.style.setProperty("stroke-dashoffset", "0");
        setDone(true);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const lastRing = useRef(-1);
  function writeRing(p: number) {
    if (Math.abs(p - lastRing.current) < 0.002 && p !== 1 && p !== 0) return;
    lastRing.current = p;
    ringRef.current?.style.setProperty("stroke-dashoffset", String(RING * (1 - p)));
  }

  function loop() {
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let p = progress.current;
      if (holding.current) {
        p = Math.min(1, p + dt / FILL_SECONDS);
      } else {
        // Ease back down; never snap to zero.
        p = Math.max(0, p - p * Math.min(1, dt * 1.6) - dt * 0.05);
      }
      progress.current = p;
      writeRing(p);
      if (p >= 1) {
        holding.current = false;
        setIsHolding(false);
        setDone(true);
        raf.current = null;
        return;
      }
      if (holding.current || p > 0) raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    if (raf.current === null) raf.current = requestAnimationFrame(step);
  }

  const start = () => {
    if (done) return;
    holding.current = true;
    setIsHolding(true);
    loop();
  };
  const stop = () => {
    if (!holding.current) return;
    holding.current = false;
    setIsHolding(false);
    loop();
  };

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  return (
    <section ref={rootRef} className={`${s.root} ${done ? s.done : ""}`} aria-labelledby="polish-title" data-reveal>
      <div className={`wrap ${s.grid}`}>
        <div className={s.copy}>
          <p className="font-label" data-r>
            {t.kicker}
          </p>
          <h2 id="polish-title" className={`title ${s.title}`} data-r="2" data-liquid>
            <Rich text={t.title} />
          </h2>
          <p className={s.lede} data-r="3">
            {t.lede}
          </p>

          <div className={s.result} aria-live="polite">
            {done && (
              <>
                <p className={`font-display ${s.doneLine}`}>{t.done}</p>
                <p className={s.reveal}>{t.reveal}</p>
                <a className={`btn btn-primary ${s.cta}`} href={waHref} target="_blank" rel="noopener">
                  {t.cta}
                </a>
              </>
            )}
          </div>
        </div>

        <div className={s.stage}>
          <div className={s.halo} aria-hidden="true" />
          <div className={s.canvas}>
            <ToothScene progress={progress} holding={holding} active={active} />
          </div>

          <button
            type="button"
            className={`${s.hold} ${isHolding ? s.isHolding : ""}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                start();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") stop();
            }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={done}
            aria-describedby="polish-title"
            data-cursor="hold"
          >
            <svg viewBox="0 0 100 100" aria-hidden="true" className={s.ring}>
              <circle cx="50" cy="50" r="46" className={s.track} />
              <circle
                ref={ringRef}
                cx="50"
                cy="50"
                r="46"
                className={s.fill}
                style={{ strokeDasharray: RING, strokeDashoffset: RING }}
              />
            </svg>
            <span>{done ? "✓" : isHolding ? t.holding : t.hold}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
