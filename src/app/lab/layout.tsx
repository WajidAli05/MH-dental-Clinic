import { notFound } from "next/navigation";

// Dev-only tools: the mesh lab and the before/after render stage (scripts/render-ba.mjs).
// They return 404 in production builds.
export const metadata = { robots: { index: false } };

export default function LabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
