"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { View } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { Dict } from "@/content/en";
import Rich from "@/components/ui/Rich";
import { ArrowGlyph } from "@/components/ui/icons";
import { studioEnvironment } from "@/three/teeth";
import { MODELS } from "./ServiceModels";
import s from "./Services.module.css";

const ServicesCanvas = dynamic(() => import("./ServicesCanvas"), { ssr: false });

function ViewLights() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = studioEnvironment(gl);
  }, [gl, scene]);
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <directionalLight position={[-3, 1, -2]} intensity={0.6} color="#c9f5f0" />
    </>
  );
}

type Item = Dict["services"]["items"][number];

function Card({ it, i, ask, href, tone, mounted }: { it: Item; i: number; ask: string; href: string; tone: string; mounted: boolean }) {
  const hot = useRef(false);
  const card = useRef<HTMLElement>(null);
  const Model = MODELS[it.id];

  // A gentle tilt toward the pointer.
  const onMove = (e: React.PointerEvent) => {
    const el = card.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-py * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * 8).toFixed(2)}deg`);
  };

  return (
    <article
      ref={card}
      className={`${s.card} ${s[tone]}`}
      onPointerEnter={() => (hot.current = true)}
      onPointerLeave={() => {
        hot.current = false;
        card.current?.style.setProperty("--rx", "0deg");
        card.current?.style.setProperty("--ry", "0deg");
      }}
      onPointerMove={onMove}
      data-reveal
    >
      {/* Each card reveals on its own (a 12-card grid is too tall to reveal as one on a short
          phone). The reveal moves this wrapper; the tilt lives on .inner so they never fight. */}
      <div className={s.rise} data-r={String((i % 2) + 1)}>
      <div className={s.inner}>
        <span className={`${s.num} display`} aria-hidden="true">
          {String(i + 1).padStart(2, "0")}
        </span>
        <div className={s.art}>
          {mounted && Model ? (
            <View className={s.view}>
              <ViewLights />
              <Suspense fallback={null}>
                <Model hot={hot} />
              </Suspense>
            </View>
          ) : null}
        </div>
        <div className={s.body}>
          <h3 className={s.name}>{it.name}</h3>
          <p className={s.text}>{it.text}</p>
        </div>
        <a className={s.ask} href={href} target="_blank" rel="noopener" aria-label={`${ask}: ${it.name}`} data-cursor="open">
          <ArrowGlyph />
        </a>
      </div>
      </div>
    </article>
  );
}

const TONES = ["paper", "paper", "lime", "paper", "aqua", "paper", "paper", "ink", "paper", "paper", "dark", "lime"];

export default function Services({ t, hrefFor }: { t: Dict["services"]; hrefFor: Record<string, string> }) {
  const root = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "600px 0px" });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  return (
    <section id="services" ref={root} className={s.services} aria-labelledby="services-title">
      {near && <ServicesCanvas active={near} />}
      <div className="wrap">
        <header className={s.head} data-reveal>
          <p className="label" data-r>
            {t.kicker}
          </p>
          <h2 id="services-title" className={`title ${s.title}`} data-r="2" data-liquid>
            <Rich text={t.title} />
          </h2>
          <p className={s.lede} data-r="3">
            {t.lede}
          </p>
        </header>
        <div className={s.grid}>
          {t.items.map((it, i) => (
            <Card key={it.id} it={it} i={i} ask={t.ask} href={hrefFor[it.id]} tone={TONES[i]} mounted={near} />
          ))}
        </div>
      </div>
    </section>
  );
}
