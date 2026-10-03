"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/content/en";
import Sticker from "@/components/ui/Sticker";
import { WhatsAppGlyph } from "@/components/ui/icons";
import type { HeroState } from "./HeroScene";
import s from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger);
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/** Split a word into letter spans (Latin) or keep it whole (Urdu, whose letters must stay joined). */
function Letters({ text, split }: { text: string; split: boolean }) {
  if (!split) return <span className={s.l}>{text}</span>;
  return (
    <>
      {[...text].map((c, i) => (
        <span key={i} className={s.l}>
          {c === " " ? " " : c}
        </span>
      ))}
    </>
  );
}

type Props = { t: Dict["hero"]; waHref: string; phoneHref: string; lang: "en" | "ur" };

export default function Hero({ t, waHref, phoneHref, lang }: Props) {
  const root = useRef<HTMLElement>(null);
  const state = useRef<HeroState>({ progress: 0, pointerX: 0, pointerY: 0, reduced: false });
  const [active, setActive] = useState(true);
  const split = lang === "en";

  useEffect(() => {
    const el = root.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.current.reduced = reduced;

    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);

    const onPointer = (e: PointerEvent) => {
      state.current.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set([`.${s.l}`, `.${s.pop}`, `.${s.fade}`], { clearProps: "all", opacity: 1 });
        gsap.set(`.${s.scribble} path`, { strokeDashoffset: 0 });
        return;
      }
      // Intro: letters rise, stickers pop, scribble draws, the rest fades up.
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(`.${s.back} .${s.l}`, { yPercent: 110, rotate: 6, duration: 1.3, stagger: 0.05 }, 0.1)
        .from(`.${s.front} .${s.l}`, { yPercent: -110, rotate: -6, duration: 1.3, stagger: 0.04 }, 0.35)
        .from(`.${s.pop}`, { scale: 0, rotate: -40, duration: 1.1, stagger: 0.12, ease: "back.out(2.2)" }, 0.9)
        .fromTo(`.${s.scribble} path`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" }, 0.8)
        .from(`.${s.fade}`, { y: 30, opacity: 0, duration: 1, stagger: 0.08 }, 1.1);

      // Scroll: the words pull apart and grow, the tooth turns (read by the 3D scene).
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => (state.current.progress = self.progress),
      });
      gsap.to(`.${s.back}`, {
        scale: 1.25,
        yPercent: -30,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(`.${s.front}`, {
        xPercent: lang === "ur" ? 18 : -18,
        yPercent: 40,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(`.${s.stickers} > *`, {
        y: (i) => -160 - i * 80,
        rotate: (i) => (i % 2 ? 50 : -50),
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    }, el);

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      ctx.revert();
    };
  }, [lang]);

  return (
    <section ref={root} className={s.hero} aria-labelledby="hero-title" data-cursor-theme="dark">
      <div className={s.stage}>
        <p className={`${s.corner} ${s.cornerStart} label ${s.fade}`}>MH Medical &amp; Dental Clinic</p>
        <p className={`${s.corner} ${s.cornerEnd} label ${s.fade}`}>
          {t.rating} <span aria-hidden="true">★</span>
        </p>

        <h1 id="hero-title" className={s.srOnly}>
          {t.back} {t.front} {t.where}
        </h1>

        {/* Behind the tooth */}
        <div className={`${s.back} display`} aria-hidden="true">
          <span className={s.mask}>
            <Letters text={t.back} split={split} />
          </span>
        </div>

        {/* The tooth, in its own canvas between the two words */}
        <div className={s.canvas} data-cursor="tap" data-cursor-label={t.touch}>
          <HeroScene state={state} active={active} />
        </div>

        {/* In front of the tooth */}
        <div className={`${s.front} display`} aria-hidden="true">
          <span className={s.mask}>
            <Letters text={t.front} split={split} />
          </span>
        </div>

        <svg className={s.scribble} viewBox="0 0 600 600" aria-hidden="true">
          <path
            pathLength={1}
            d="M300 70c120-6 230 80 236 210 6 140-110 250-250 248C140 526 50 420 62 290 74 160 190 92 330 96c110 4 190 70 200 150"
          />
        </svg>

        <p className={`${s.where} ${s.fade}`}>
          <span className="hl-ink">{t.where}</span>
          <span className={`serif-i ${s.aside}`}>{t.aside}</span>
        </p>

        {/* Outer span: scroll motion. Inner span: the intro pop. Sticker itself: hover wobble. */}
        <div className={s.stickers}>
          {(
            [
              [s.st1, 3, "ink"],
              [s.st2, 11, "lime"],
              [s.st3, 21, "red"],
            ] as const
          ).map(([pos, seed, tone], i) => (
            <span key={i} className={pos}>
              <span className={s.pop}>
                <Sticker seed={seed} tone={tone}>
                  {t.stickers[i]}
                </Sticker>
              </span>
            </span>
          ))}
        </div>

        <div className={s.bottom}>
          <p className={`${s.lede} ${s.fade}`}>{t.lede}</p>
          <div className={`${s.ctas} ${s.fade}`}>
            <a className="btn btn-primary" href={waHref} target="_blank" rel="noopener" data-cursor="book">
              <WhatsAppGlyph />
              {t.book}
            </a>
            <a className="btn btn-ghost" href={phoneHref}>
              {t.call}
            </a>
          </div>
          <p className={`${s.touch} label ${s.fade}`} aria-hidden="true">
            <i /> {t.touch}
          </p>
        </div>
      </div>
    </section>
  );
}
