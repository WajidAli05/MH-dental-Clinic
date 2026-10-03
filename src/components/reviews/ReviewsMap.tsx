"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import type { Dict } from "@/content/en";
import type { Review } from "@/content/reviews";
import Rich from "@/components/ui/Rich";
import s from "./ReviewsMap.module.css";

/* Islamabad's sector grid, north (E) to south (I). Sector numbers grow westward. */
const ROWS: [string, number[]][] = [
  ["E", [7, 8, 9, 10, 11]],
  ["F", [5, 6, 7, 8, 9, 10, 11]],
  ["G", [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]],
  ["H", [8, 9, 10, 11, 12, 13]],
  ["I", [8, 9, 10, 11, 12, 14, 15, 16]],
];
const DOTS = 5;
const STEP = 9;
const SECTOR = DOTS * STEP + 16;
const W = 12 * SECTOR + 40;
const H = ROWS.length * SECTOR + 70;

function sectorOrigin(row: number, num: number) {
  const col = 16 - num; // low numbers lie east, so they sit on the right
  return { x: 20 + col * SECTOR + 8, y: 50 + row * SECTOR };
}

function rng(seed: number) {
  let v = seed >>> 0;
  return () => (v = (v * 1664525 + 1013904223) >>> 0) / 4294967296;
}

const BUBBLE_COLORS = ["#d4f26a", "#ffffff", "#ffb4bd", "#9ff0ea", "#ffd98a"];

export default function ReviewsMap({ t, reviews, mapsUrl }: { t: Dict["reviews"]; reviews: Review[]; mapsUrl: string }) {
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const line = useRef<SVGLineElement>(null);
  const paused = useRef(false);
  const first = useRef(true);
  const n = reviews.length;

  // Dots for every sector, plus a scatter of reviewer bubbles (never on I-8, the clinic).
  const { dots, i8, bubbles } = useMemo(() => {
    const d: { x: number; y: number; key: string; home: boolean; delay: number }[] = [];
    let home = { x: 0, y: 0 };
    const sectors: { x: number; y: number }[] = [];
    ROWS.forEach(([letter, nums], r) => {
      for (const num of nums) {
        const o = sectorOrigin(r, num);
        const isHome = letter === "I" && num === 8;
        if (isHome) home = { x: o.x + (DOTS * STEP) / 2 - STEP / 2, y: o.y + (DOTS * STEP) / 2 - STEP / 2 };
        else sectors.push({ x: o.x + (DOTS * STEP) / 2, y: o.y + (DOTS * STEP) / 2 });
        for (let a = 0; a < DOTS; a++)
          for (let b = 0; b < DOTS; b++) {
            const x = o.x + a * STEP;
            const y = o.y + b * STEP;
            d.push({ x, y, key: `${letter}${num}-${a}-${b}`, home: isHome, delay: 0 });
          }
      }
    });
    // The shimmer ripples outward from I-8.
    d.forEach((p) => (p.delay = Math.hypot(p.x - home.x, p.y - home.y) / 260));
    const r = rng(42);
    const picks = [...sectors].sort(() => r() - 0.5).slice(0, 10);
    return { dots: d, i8: home, bubbles: picks };
  }, []);

  const go = useCallback((dir: number) => setI((v) => (v + dir + n) % n), [n]);

  // Auto-advance, paused while the visitor is reading (hover or focus).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => !paused.current && go(1), 6500);
    return () => clearInterval(id);
  }, [go]);

  // Card entrance: squash in with a spring, words rise, then the line reaches the bubble.
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        el,
        { y: first.current ? 0 : 50, rotate: first.current ? 0 : i % 2 ? 4 : -4, scaleX: 0.92, scaleY: 1.08, opacity: 0 },
        { y: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.9, ease: "elastic.out(1, 0.6)" },
      )
        .from(`.${s.w}`, { yPercent: 100, opacity: 0, duration: 0.6, stagger: 0.018, ease: "power3.out" }, 0.1)
        .from(`.${s.avatar}`, { scale: 0, rotate: -90, duration: 0.7, ease: "back.out(2.5)" }, 0.15);
      if (line.current) tl.fromTo(line.current, { strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" }, 0.2);
    }, el.parentElement!);
    first.current = false;
    return () => ctx.revert();
  }, [i]);

  // Swipe on touch.
  const startX = useRef<number | null>(null);

  const rv = reviews[i];
  const b = bubbles[i % bubbles.length];
  const initials = rv.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <section id="reviews" className={s.root} aria-labelledby="reviews-title">
      <div className={`wrap ${s.head}`} data-reveal>
        <div>
          <p className="label" data-r>
            {t.kicker}
          </p>
          <h2 id="reviews-title" className="title" data-r="2" data-liquid>
            <Rich text={t.title} />
          </h2>
        </div>
        <div className={s.score} data-r="3">
          <span className={`display ${s.big}`} dir="ltr">
            4.8
          </span>
          <span className={s.stars} aria-hidden="true">
            ★★★★★
          </span>
          <p>{t.lede}</p>
        </div>
      </div>

      <div className={`wrap ${s.mapWrap}`}>
        <div ref={mapBox} className={s.map} dir="ltr">
          <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} aria-hidden="true">
            {ROWS.map(([letter, nums], r) =>
              nums.map((num) => {
                const o = sectorOrigin(r, num);
                return (
                  <text key={`${letter}${num}`} x={o.x + (DOTS * STEP) / 2 - STEP / 2} y={o.y - 8} className={s.sectorLabel}>
                    {letter}-{num}
                  </text>
                );
              }),
            )}
            {dots.map((d) => (
              <circle
                key={d.key}
                cx={d.x}
                cy={d.y}
                r={d.home ? 3.2 : 2.1}
                className={d.home ? s.homeDot : s.mapDot}
                style={{ animationDelay: `${(-6 + d.delay).toFixed(2)}s` }}
              />
            ))}
            <g transform={`translate(${i8.x} ${i8.y})`}>
              <circle r="30" className={s.ping} />
              <circle r="30" className={s.ping} style={{ animationDelay: "-1.3s" }} />
              <circle r="9" className={s.pin} />
            </g>
            <text x={i8.x + 40} y={i8.y + 5} className={s.here}>
              {t.here}
            </text>
            <line
              ref={line}
              x1={b.x}
              y1={b.y}
              x2={W / 2}
              y2={H - 6}
              className={s.link}
              key={`l-${i}`}
            />
          </svg>

          {bubbles.map((p, k) => {
            // Bubbles show the reviewers on the current "page" of the carousel.
            const page = Math.floor(i / bubbles.length);
            const idx = page * bubbles.length + k;
            const who = reviews[idx];
            if (!who) return null;
            const on = idx === i;
            return (
              <button
                key={k}
                type="button"
                className={`${s.bubble} ${on ? s.bubbleOn : ""}`}
                style={
                  {
                    left: `${(p.x / W) * 100}%`,
                    top: `${(p.y / H) * 100}%`,
                    "--c": BUBBLE_COLORS[k % BUBBLE_COLORS.length],
                    animationDelay: `${-k * 0.7}s`,
                  } as React.CSSProperties
                }
                onClick={() => setI(idx)}
                aria-label={who.name}
                tabIndex={-1}
              >
                {who.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("")}
              </button>
            );
          })}
        </div>

        <div className={s.cardRow}>
          <button type="button" className={s.arrow} onClick={() => go(-1)} aria-label={t.prev} data-cursor="tap">
            ←
          </button>
          <div
            className={s.cardSlot}
            onMouseEnter={() => (paused.current = true)}
            onMouseLeave={() => (paused.current = false)}
            onFocus={() => (paused.current = true)}
            onBlur={() => (paused.current = false)}
            onPointerDown={(e) => (startX.current = e.clientX)}
            onPointerUp={(e) => {
              if (startX.current === null) return;
              const dx = e.clientX - startX.current;
              startX.current = null;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            }}
          >
            <div ref={card} className={s.card} aria-live="polite" key={i}>
              <span className={s.avatar} style={{ "--c": BUBBLE_COLORS[i % BUBBLE_COLORS.length] } as React.CSSProperties}>
                {initials}
              </span>
              <blockquote className={s.quote} lang="en">
                <span className={s.mark} aria-hidden="true">
                  “
                </span>
                {rv.text.split(" ").map((w, k) => (
                  <span key={k} className={s.wm}>
                    <span className={s.w}>{w}&nbsp;</span>
                  </span>
                ))}
              </blockquote>
              <p className={s.who}>
                <b lang="en">{rv.name}</b>
                <span className="label">{t.source}</span>
              </p>
              <p className={s.count} dir="ltr">
                {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </p>
            </div>
          </div>
          <button type="button" className={s.arrow} onClick={() => go(1)} aria-label={t.next} data-cursor="tap">
            →
          </button>
        </div>

        <a className={`btn btn-ghost ${s.all}`} href={mapsUrl} target="_blank" rel="noopener">
          {t.all}
        </a>
      </div>
    </section>
  );
}
