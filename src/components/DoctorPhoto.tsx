"use client";

import { useState } from "react";
import Image from "next/image";

// TODO(client): replace /media/doctor.jpg with Dr Riaz Ahmed's real photo (with his permission).
// The current file is a TEMPORARY stock placeholder: photo by Laurent Yasiel on Unsplash
// (https://unsplash.com/photos/607-cXjrge4, Unsplash License). The embroidered name on the
// scrubs was painted out so it cannot be read as another person's clinic.
export default function DoctorPhoto({ alt, className }: { alt: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, #fff, var(--panel-strong) 70%)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-display), sans-serif",
          fontWeight: 800,
          fontSize: "96px",
          color: "var(--aqua-deep)",
        }}
      >
        RA
      </div>
    );
  }
  return (
    <div className={className} style={{ position: "relative" }}>
      <Image
        src="/media/doctor.jpg"
        alt={alt}
        fill
        sizes="(max-width: 860px) 100vw, 40vw"
        style={{ objectFit: "cover" }}
        onError={() => setMissing(true)}
      />
    </div>
  );
}
