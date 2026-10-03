import s from "./Sticker.module.css";

function rng(seed: number) {
  let v = seed >>> 0;
  return () => (v = (v * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** An irregular spiky badge path, seeded so it is identical on every render. */
function spikes(seed: number, n = 14) {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? 46 + r() * 4 : 30 + r() * 8;
    pts.push(`${(50 + Math.cos(a) * rad).toFixed(1)},${(50 + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

type Props = {
  children: React.ReactNode;
  seed?: number;
  tone?: "ink" | "lime" | "aqua" | "red";
  className?: string;
  style?: React.CSSProperties;
  spin?: boolean;
};

/** A spiky sticker badge, slowly turning, wobbling on hover. Decoration plus one short line. */
export default function Sticker({ children, seed = 7, tone = "ink", className = "", style, spin = true }: Props) {
  return (
    <span className={`${s.sticker} ${s[tone]} ${className}`} style={style}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className={spin ? s.spin : undefined}>
        <path d={spikes(seed)} />
      </svg>
      <span className={s.text}>{children}</span>
    </span>
  );
}
