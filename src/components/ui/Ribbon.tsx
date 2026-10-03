"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import s from "./Ribbon.module.css";

gsap.registerPlugin(ScrollTrigger);

/** A tilted marquee band. It drifts on its own and leans into the scroll speed. */
export default function Ribbon({ items, tone = "lime", tilt = -2.2 }: { items: string[]; tone?: "lime" | "ink"; tilt?: number }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.to(el, { xPercent: -50, ease: "none", duration: 38, repeat: -1 });
    let skew = 0;
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-1, 1, self.getVelocity() / 2400);
        tween.timeScale(1 + Math.abs(v) * 5);
        skew = v * -6;
        gsap.to(el, { skewX: skew, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      },
    });
    return () => {
      tween.kill();
      st.kill();
    };
  }, []);

  const row = [...items, ...items, ...items];
  return (
    <div className={`${s.band} ${s[tone]}`} style={{ "--tilt": `${tilt}deg` } as React.CSSProperties} aria-hidden="true">
      <div ref={track} className={s.track}>
        {[0, 1].map((copy) => (
          <div key={copy} className={s.group}>
            {row.map((it, i) => (
              <span key={i} className={s.item}>
                {it}
                <svg viewBox="0 0 24 24" className={s.star}>
                  <path d="M12 0l2.6 8.4L24 12l-9.4 3.6L12 24l-2.6-8.4L0 12l9.4-3.6z" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
