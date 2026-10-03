import { Fragment } from "react";

/** Render copy markup: *word* becomes an italic serif accent, ==word== a lime marker highlight. */
export default function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*|==[^=]+==)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("==") && p.endsWith("==")) return <mark key={i}>{p.slice(2, -2)}</mark>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/** Plain text version of the same markup, for aria labels and messages. */
export function plain(text: string) {
  return text.replace(/==|\*/g, "");
}
