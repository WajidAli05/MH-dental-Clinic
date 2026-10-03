"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Dict } from "@/content/en";
import { whatsappLink } from "@/content/clinic";
import Rich from "@/components/ui/Rich";
import type { Bridge } from "./MouthScene";
import s from "./MouthExplorer.module.css";

const MouthScene = dynamic(() => import("./MouthScene"), { ssr: false });

type Props = { t: Dict["mouth"]; askPrefix: string };

/** Teach-first section: a 3D mouth with hotspots; each opens a card on a cord. */
export default function MouthExplorer({ t, askPrefix }: Props) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bridge = useRef<Bridge>({ stage: null, dots: new Map(), cord: null, card: null, active: null, drag: { x: 0, down: false } });
  const [active, setActive] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const closedAt = useRef(0); // when a card was last closed (see open() below)
  const item = t.items.find((i) => i.id === active) ?? null;
  const index = item ? t.items.indexOf(item) : -1;

  useEffect(() => {
    bridge.current.stage = stage.current;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "1000px 0px" });
    if (root.current) io.observe(root.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closedAt.current = performance.now();
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    bridge.current.active = active;
  }, [active]);

  // The card sits opposite its dot, so the cord has room to swing.
  const [side, setSide] = useState<"start" | "end">("end");
  // On touch screens, closing a card used to re-open the next one: the browser fires emulated
  // hover/focus/click on whatever lands under the finger. Hover-open is mouse-only, focus-open is
  // keyboard-only, and taps right after a close are ignored.
  // Event timestamps share performance.now()'s clock and keep render code pure.
  const close = (e: React.SyntheticEvent) => {
    closedAt.current = e.timeStamp;
    setActive(null);
  };
  const open = (id: string, e: React.SyntheticEvent) => {
    if (e.timeStamp - closedAt.current < 450) return;
    const x = Number(bridge.current.dots.get(id)?.dataset.x ?? 0);
    const w = stage.current?.clientWidth ?? 0;
    // cardStart is always the physical left (the CSS pins it in both directions).
    setSide(x > w / 2 ? "start" : "end");
    setActive(id);
  };

  // Drag to turn the model.
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    bridge.current.drag.down = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (bridge.current.drag.down) bridge.current.drag.x += e.movementX;
  };
  const onUp = () => (bridge.current.drag.down = false);

  return (
    <section id="learn" ref={root} className={s.root} aria-labelledby="learn-title">
      <div className={`wrap ${s.grid}`}>
        <div className={s.side} data-reveal>
          <p className="label" data-r>
            {t.kicker}
          </p>
          <h2 id="learn-title" className="title" data-r="2" data-liquid>
            <Rich text={t.title} />
          </h2>
          <p className={s.lede} data-r="3">
            {t.lede}
          </p>
          <ol className={s.list} data-r="4">
            {t.items.map((it, i) => (
              <li key={it.id}>
                <button
                  type="button"
                  className={`${s.row} ${active === it.id ? s.rowOn : ""}`}
                  onPointerEnter={(e) => e.pointerType === "mouse" && open(it.id, e)}
                  onFocus={(e) => e.currentTarget.matches(":focus-visible") && open(it.id, e)}
                  onClick={(e) => open(it.id, e)}
                  aria-expanded={active === it.id}
                  aria-controls="mouth-card"
                >
                  <span className={s.rowNum}>{i + 1}</span>
                  <span>
                    <b>{it.tooth}</b>
                    <small>{it.problem}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div
          ref={stage}
          className={s.stage}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          data-cursor="drag"
        >
          <div className={s.halo} aria-hidden="true" />
          <div className={s.canvas}>{near && <MouthScene bridge={bridge} active={near} />}</div>

          <svg className={s.cords} aria-hidden="true">
            <path
              key={active ?? "none"}
              ref={(el) => {
                bridge.current.cord = el;
              }}
              className={s.cord}
            />
          </svg>

          {t.items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              ref={(el) => {
                if (el) bridge.current.dots.set(it.id, el);
                else bridge.current.dots.delete(it.id);
              }}
              className={`${s.dot} ${active === it.id ? s.dotOn : ""}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && open(it.id, e)}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && open(it.id, e)}
              onClick={(e) => open(it.id, e)}
              aria-label={`${it.tooth}: ${it.problem}`}
              aria-expanded={active === it.id}
              aria-controls="mouth-card"
              data-cursor="open"
            >
              <span>{i + 1}</span>
            </button>
          ))}

          {item && (
            <article
              id="mouth-card"
              key={item.id}
              ref={(el) => {
                bridge.current.card = el;
              }}
              className={`${s.card} ${side === "start" ? s.cardStart : s.cardEnd}`}
              role="region"
              aria-label={item.tooth}
            >
              <header className={s.cardHead}>
                <span className={s.cardNum}>{index + 1}</span>
                <div>
                  <p className="label">{item.tooth}</p>
                  <h3 className={s.cardTitle}>{item.problem}</h3>
                </div>
                <button type="button" className={s.close} onClick={close} aria-label={t.close}>
                  ×
                </button>
              </header>
              <dl className={s.facts}>
                <dt>{t.causes}</dt>
                <dd>{item.causes}</dd>
                <dt>{t.fix}</dt>
                <dd>{item.fix}</dd>
              </dl>
              <a className={`btn btn-ink ${s.cardCta}`} href={whatsappLink(`${askPrefix} ${item.problem}`)} target="_blank" rel="noopener">
                {t.ask}
              </a>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
