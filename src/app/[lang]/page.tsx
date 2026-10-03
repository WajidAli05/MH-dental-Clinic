import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "./dictionaries";
import { clinic, whatsappLink } from "@/content/clinic";
import { reviews } from "@/content/reviews";
import Nav, { Mark } from "@/components/Nav";
import SiteEffects from "@/components/SiteEffects";
import Cursor from "@/components/cursor/Cursor";
import Hero from "@/components/hero/Hero";
import Ribbon from "@/components/ui/Ribbon";
import Rich from "@/components/ui/Rich";
import Sticker from "@/components/ui/Sticker";
import { WhatsAppGlyph } from "@/components/ui/icons";
import Services from "@/components/services/Services";
import MouthExplorer from "@/components/mouth/MouthExplorer";
import BeforeAfter from "@/components/BeforeAfter";
import PolishMoment from "@/components/polish/PolishMoment";
import VisitSteps from "@/components/VisitSteps";
import ReviewsMap from "@/components/reviews/ReviewsMap";
import DoctorPhoto from "@/components/DoctorPhoto";
import ContactForm from "@/components/ContactForm";
import s from "./page.module.css";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDictionary(lang);
  const wa = whatsappLink(d.whatsapp.general);
  const askAbout = (name: string) => whatsappLink(`${d.whatsapp.service} ${name}`);
  const otherLang = lang === "en" ? "/ur" : "/en";
  const serviceHrefs = Object.fromEntries(d.services.items.map((i) => [i.id, askAbout(i.name)]));

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Cursor labels={d.cursor} />
      <SiteEffects />
      <Nav t={d.nav} otherLangHref={otherLang} waHref={wa} brand={clinic.name} />

      <main id="main" tabIndex={-1}>
        <div id="top" />
        <Hero t={d.hero} waHref={wa} phoneHref={clinic.phoneHref} lang={lang} />

        <div className={s.ribbonGap}>
          <Ribbon items={d.ribbon} />
        </div>

        <Services t={d.services} hrefFor={serviceHrefs} />

        <MouthExplorer t={d.mouth} askPrefix={d.whatsapp.service} />

        {/* Before and after */}
        <section id="results" className={s.results} aria-labelledby="results-title" data-reveal>
          <div className="wrap">
            <div className={s.resultsHead}>
              <div>
                <p className="label" data-r>
                  {d.results.kicker}
                </p>
                <h2 id="results-title" className="title" data-r="2" data-liquid>
                  <Rich text={d.results.title} />
                </h2>
              </div>
              <p className={s.ledeSmall} data-r="3">
                {d.results.lede}
              </p>
            </div>
            <div className={s.resultsGrid}>
              {d.results.items.map((it, i) => (
                <figure key={it.id} className={s.resultCard} data-r={String(Math.min(5, i + 2))} data-cursor="drag">
                  <BeforeAfter
                    id={it.id}
                    name={it.name}
                    before={d.results.before}
                    after={d.results.after}
                    drag={d.results.drag}
                    hintDelay={i * 0.15}
                  />
                  <figcaption className={s.resultName}>
                    <span className="label">0{i + 1}</span> {it.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <PolishMoment t={d.polish} waHref={askAbout(d.prices.items[0].name)} />

        <div className={s.ribbonGap}>
          <Ribbon items={d.ribbon} tone="ink" tilt={1.6} />
        </div>

        {/* Prices: an ink band that scales up into place */}
        <section id="prices" className={s.prices} aria-labelledby="prices-title" data-scale>
          <div className="wrap" data-reveal>
            <p className="label" data-r>
              {d.prices.kicker}
            </p>
            <h2 id="prices-title" className={`title ${s.pricesTitle}`} data-r="2" data-liquid>
              <Rich text={d.prices.title} />
            </h2>
            <p className={s.lede} data-r="3">
              {d.prices.lede}
            </p>
            <div className={s.priceGrid}>
              {d.prices.items.map((it, i) => (
                <article key={it.id} className={`${s.priceCard} ${it.id === "ask" ? s.priceAsk : ""}`} data-r={String(i + 3)}>
                  {it.id === "polish" && (
                    <Sticker seed={33} tone="lime" className={s.priceSticker}>
                      {d.hero.stickers[0]}
                    </Sticker>
                  )}
                  <h3 className={s.priceName}>{it.name}</h3>
                  {it.price ? (
                    <p className={`display ${s.price}`}>
                      <span className={`label ${s.currency}`}>{d.prices.from}</span>
                      <span dir="ltr">{it.price}</span>
                    </p>
                  ) : (
                    <p className={`display ${s.price} ${s.priceIcon}`} aria-hidden="true">
                      ?
                    </p>
                  )}
                  {"note" in it && it.note ? <p className={s.priceNote}>{it.note}</p> : null}
                  <ul className={s.points}>
                    {it.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <a
                    className={`btn ${it.id === "polish" ? "btn-primary" : s.btnOnInk}`}
                    href={askAbout(it.name)}
                    target="_blank"
                    rel="noopener"
                  >
                    {it.cta}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <VisitSteps t={d.visit} />

        <ReviewsMap t={d.reviews} reviews={reviews} mapsUrl={clinic.mapsUrl} />

        {/* Doctor */}
        <section className={s.doctor} aria-labelledby="doctor-title" data-reveal>
          <div className={`wrap ${s.doctorGrid}`}>
            <div className={s.doctorArt} data-r>
              <DoctorPhoto alt={d.doctor.name} className={s.doctorPhoto} />
              <Sticker seed={52} tone="aqua" className={s.doctorSticker}>
                {d.doctor.points[0]}
              </Sticker>
            </div>
            <div className={s.doctorCopy}>
              <p className="label" data-r="2">
                {d.doctor.kicker}
              </p>
              <h2 id="doctor-title" className={`display ${s.doctorName}`} data-r="3" data-liquid>
                {d.doctor.name}
              </h2>
              <p className={s.doctorText} data-r="4">
                {d.doctor.text}
              </p>
              <ul className={s.doctorPoints} data-r="5">
                {d.doctor.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={s.faq} aria-labelledby="faq-title" data-reveal>
          <div className={`wrap ${s.faqGrid}`}>
            <div>
              <p className="label" data-r>
                {d.faq.kicker}
              </p>
              <h2 id="faq-title" className="title" data-r="2" data-liquid>
                <Rich text={d.faq.title} />
              </h2>
            </div>
            <div className={s.faqList} data-r="3">
              {d.faq.items.map((f, i) => (
                <details key={f.q} className={s.faqItem} name="faq" open={i === 0}>
                  <summary className={s.faqQ}>
                    <span className={s.faqNum}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={s.faqText}>{f.q}</span>
                    <i aria-hidden="true" />
                  </summary>
                  <p className={s.faqA}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="visit" className={s.contact} aria-labelledby="contact-title" data-reveal>
          <div className={`wrap ${s.contactGrid}`}>
            <div className={s.contactMain}>
              <p className="label" data-r>
                {d.contact.kicker}
              </p>
              <h2 id="contact-title" className={`title ${s.contactTitle}`} data-r="2" data-liquid>
                <Rich text={d.contact.title} />
              </h2>
              <p className={s.lede} data-r="3">
                {d.contact.lede}
              </p>
              <div className={s.contactCtas} data-r="3">
                <a className="btn btn-primary" href={wa} target="_blank" rel="noopener" data-cursor="book">
                  <WhatsAppGlyph />
                  {d.nav.book}
                </a>
                <a className="btn btn-ghost" href={clinic.phoneHref}>
                  {d.hero.call}
                </a>
              </div>
              <div data-r="4">
                <ContactForm t={d.contact.form} services={d.services.items.map((i) => i.name)} />
              </div>
            </div>

            <aside className={s.infoCard} data-r="3">
              <div className={s.map}>
                <iframe title={d.contact.directions} src={clinic.mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
              <div className={s.infoBody}>
                <p className={s.infoLine}>{d.contact.address}</p>
                <p className={s.infoLine}>
                  <span className={s.openDot} aria-hidden="true" />
                  {d.contact.hours}
                </p>
                <p className={s.infoLine}>
                  <a href={clinic.phoneHref} dir="ltr">
                    {clinic.phoneDisplay}
                  </a>
                  <span aria-hidden="true"> · </span>
                  <a href={clinic.mobileHref} dir="ltr">
                    {clinic.mobileDisplay}
                  </a>
                </p>
                <a className={s.directions} href={clinic.mapsUrl} target="_blank" rel="noopener">
                  {d.contact.directions}
                </a>
                <div className={s.social}>
                  <span className="label">{d.contact.social}</span>
                  <a href={clinic.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a href={clinic.facebook} target="_blank" rel="noopener" aria-label="Facebook">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z" />
                    </svg>
                  </a>
                  <a href={wa} target="_blank" rel="noopener" aria-label="WhatsApp">
                    <WhatsAppGlyph />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className="wrap">
          <p className={`display ${s.footerBig}`} data-grow data-liquid>
            <Rich text={d.footer.big} />
          </p>
          <div className={s.footerGrid}>
            <div className={s.footerBrand}>
              <Mark size={44} />
              <div>
                <p className={s.footerName}>{clinic.name}</p>
                <p className={s.footerMuted}>{d.footer.tagline}</p>
                <p className={s.footerMuted}>{d.footer.women}</p>
              </div>
            </div>
            <p className={s.footerAi}>{d.footer.ai}</p>
            <p className={s.footerMuted}>
              © {new Date().getFullYear()} {clinic.name}. {d.footer.rights}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
