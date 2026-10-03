"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Smooth scroll, entrance choreography, section scale-ins, and hidden-tab pausing. */
export default function SiteEffects() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Lenis smooth scroll on GSAP's ticker, prioritised so it moves the page before
    // anything else (ScrollTrigger, the 3D view canvas) reads positions in the same frame.
    let lenis: Lenis | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);
    const startLenis = () => {
      if (lenis || reduce.matches) return;
      lenis = new Lenis({ lerp: 0.11, anchors: { offset: -72 }, autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf, false, true);
      gsap.ticker.lagSmoothing(0);
    };
    const stopLenis = () => {
      gsap.ticker.remove(raf);
      lenis?.destroy();
      lenis = null;
    };
    const onReduceChange = () => (reduce.matches ? stopLenis() : startLenis());
    reduce.addEventListener("change", onReduceChange);
    startLenis();

    // Entrances: [data-reveal] gets .in, then .settled once the stagger is done.
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          timers.push(window.setTimeout(() => el.classList.add("settled"), 1500));
          io.unobserve(el);
        });
      },
      // threshold 0: any element, however tall, reveals as soon as it enters the screen.
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    // Scale-ins: a band starts smaller with round corners and grows to full bleed as it arrives.
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-scale]").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.86, borderRadius: 64 },
          {
            scale: 1,
            borderRadius: 0,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "top 25%", scrub: 0.6 },
          },
        );
      });
      // Poster words that grow as they pass through the viewport.
      gsap.utils.toArray<HTMLElement>("[data-grow]").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.7, yPercent: 20 },
          { scale: 1, yPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "center 55%", scrub: 0.5 } },
        );
      });
    });

    const onVis = () => document.body.classList.toggle("paused", document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      reduce.removeEventListener("change", onReduceChange);
      stopLenis();
      io.disconnect();
      timers.forEach(clearTimeout);
      mm.revert();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
