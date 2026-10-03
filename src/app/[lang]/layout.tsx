import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Hanken_Grotesk, Instrument_Serif, JetBrains_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import { getDictionary, hasLocale, locales } from "./dictionaries";
import "../globals.css";

// Display: Bricolage Grotesque, squeezed on its width axis and pushed heavy, for poster-sized type.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  variable: "--font-display",
  display: "swap",
});
// Accent: an italic serif for the small editorial asides.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-hanken",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains",
  display: "swap",
});
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
  preload: false,
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#eceeea",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = getDictionary(lang);
  return {
    title: d.meta.title,
    description: d.meta.description,
    // DEPLOY STEP: set metadataBase to the live URL so og:url and og:image become absolute.
    alternates: { languages: { en: "/en", ur: "/ur" } },
    openGraph: {
      title: d.meta.title,
      description: d.meta.description,
      locale: lang === "ur" ? "ur_PK" : "en_PK",
      type: "website",
    },
    icons: { icon: "/icon.svg" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const fontVars = [bricolage.variable, serif.variable, hanken.variable, jetbrains.variable, lang === "ur" ? nastaliq.variable : ""].join(" ");

  return (
    <html lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
