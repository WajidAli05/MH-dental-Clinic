"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/content/en";
import Rich from "@/components/ui/Rich";
import s from "./VisitSteps.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Three steps joined by a water line that draws itself as you scroll. */
export default function VisitSteps({ t }: { t: Dict["visit"] }) {
  const root = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    const p = path.current;
    const el = root.current;
    if (!p || !el) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        p,
        { strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
        },
      );
      const dots = el.querySelectorAll(`.${s.dot}`);
      dots.forEach((d, i) => {
        gsap.fromTo(
          d,
          { scale: 0.4, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            ease: "back.out(2)",
            scrollTrigger: { trigger: el, start: `top+=${120 + i * 180} 70%`, toggleActions: "play none none reverse" },
          },
        );
      });
    });
    // Reduced motion: the line is simply drawn.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      p.style.strokeDashoffset = "0";
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className={s.root} aria-labelledby="visit-title" data-reveal>
      <div className="wrap">
        <p className="font-label" data-r>
          {t.kicker}
        </p>
        <h2 id="visit-title" className={`title ${s.title}`} data-r="2" data-liquid>
          <Rich text={t.title} />
        </h2>

        <div className={s.track}>
          <svg className={s.line} viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
            <path
              ref={path}
              d="M0 60 C 150 10, 250 110, 400 60 S 650 10, 800 60 S 1050 110, 1200 60"
              fill="none"
              stroke="var(--aqua-deep)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ol className={s.steps}>
            {t.steps.map((st) => (
              <li key={st.n} className={s.step}>
                <span className={s.dot} aria-hidden="true" />
                <span className={`font-label ${s.n}`}>{st.n}</span>
                <h3 className={`font-display ${s.stepTitle}`}>{st.title}</h3>
                <p className={s.text}>{st.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <p className={s.hygiene} data-r="3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
            <path d="M8.5 12l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.hygiene}
        </p>
      </div>
    </section>
  );
}
