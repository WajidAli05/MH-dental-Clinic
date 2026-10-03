"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import s from "./BeforeAfter.module.css";

type Props = {
  id: string;
  name: string;
  before: string;
  after: string;
  drag: string;
  hintDelay?: number;
};

/** Drag-to-compare on one image. A visually hidden range input carries keyboard and screen readers. */
export default function BeforeAfter({ id, name, before, after, drag, hintDelay = 0 }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [missing, setMissing] = useState(false);
  const hint = useRef<gsap.core.Timeline | null>(null);

  const setPos = (v: number) => root.current?.style.setProperty("--pos", `${v}%`);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let played = false;
    const state = { v: 50 };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || played) return;
        played = true;
        io.disconnect();
        hint.current = gsap
          .timeline({ delay: 0.3 + hintDelay, onUpdate: () => setPos(state.v) })
          .to(state, { v: 70, duration: 0.7, ease: "power2.inOut" })
          .to(state, { v: 32, duration: 0.9, ease: "power2.inOut" })
          .to(state, { v: 50, duration: 0.7, ease: "power3.out" });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      hint.current?.kill();
    };
  }, [hintDelay]);

  return (
    <div ref={root} className={s.root} dir="ltr" style={{ "--pos": "50%" } as React.CSSProperties}>
      {missing ? (
        <div className={s.placeholder} aria-hidden="true" />
      ) : (
        <>
          <Image
            src={`/media/ba-${id}-after.jpg`}
            alt=""
            fill
            sizes="(max-width: 860px) 100vw, 50vw"
            className={s.img}
            onError={() => setMissing(true)}
          />
          <div className={s.beforeLayer}>
            <Image
              src={`/media/ba-${id}-before.jpg`}
              alt=""
              fill
              sizes="(max-width: 860px) 100vw, 50vw"
              className={s.img}
              onError={() => setMissing(true)}
            />
          </div>
        </>
      )}

      <span className={`${s.tag} ${s.tagBefore} font-label`}>{before}</span>
      <span className={`${s.tag} ${s.tagAfter} font-label`}>{after}</span>

      <div className={s.handle} aria-hidden="true">
        <span className={s.knob}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      <input
        ref={input}
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        className={s.range}
        aria-label={`${name}: ${drag}`}
        onInput={(e) => {
          hint.current?.kill();
          setPos(Number((e.target as HTMLInputElement).value));
        }}
      />
    </div>
  );
}
