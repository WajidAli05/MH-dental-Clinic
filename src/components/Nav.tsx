"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/content/en";
import { WhatsAppGlyph } from "./ui/icons";
import s from "./Nav.module.css";

type Props = { t: Dict["nav"]; otherLangHref: string; waHref: string; brand: string };

export default function Nav({ t, otherLangHref, waHref, brand }: Props) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = false;
    const onScroll = () => {
      const next = window.scrollY > 40;
      if (next !== last) {
        last = next;
        setSolid(next);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    ["#services", t.services],
    ["#learn", t.learn],
    ["#results", t.results],
    ["#prices", t.prices],
    ["#reviews", t.reviews],
    ["#visit", t.visit],
  ] as const;

  return (
    <>
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <header className={`${s.bar} ${solid ? s.solid : ""} ${open ? s.isOpen : ""}`}>
        <nav className={s.inner} aria-label="Main">
          <a href="#top" className={s.brand} aria-label={brand}>
            <Mark />
            <span className={s.brandText}>
              <b>MH</b> <span>Medical &amp; Dental</span>
            </span>
          </a>

          <ul className={s.links}>
            {links.map(([href, label]) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>

          <div className={s.actions}>
            <a className={s.lang} href={otherLangHref} aria-label={t.langSwitchLabel} lang={t.langSwitch === "English" ? "en" : "ur"}>
              {t.langSwitch}
            </a>
            <a className={`btn btn-primary ${s.book}`} href={waHref} target="_blank" rel="noopener" aria-label={t.book}>
              <WhatsAppGlyph />
              <span>{t.book}</span>
            </a>
            <button
              type="button"
              className={s.burger}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.close : t.menu}
              onClick={() => setOpen((v) => !v)}
            >
              <i />
              <i />
            </button>
          </div>
        </nav>

        <div id="mobile-menu" className={s.sheet} inert={!open}>
          <ul>
            {links.map(([href, label]) => (
              <li key={href}>
                <a href={href} onClick={() => setOpen(false)} className="display">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </header>
    </>
  );
}

export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--accent)" strokeWidth="4" />
      <path
        d="M21 22c0-4 3-7 7-6.5 2 .3 3 1 4 1s2-.7 4-1c4-.5 7 2.5 7 6.5 0 5-2 7-2.6 12-.5 4.5-1.4 11-4 11-2.3 0-2.2-6.5-4.4-6.5S29.8 45 27.6 45c-2.6 0-3.5-6.5-4-11C23 29 21 27 21 22z"
        fill="var(--ink)"
      />
      <path d="M30 22h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="var(--canvas)" />
    </svg>
  );
}
