"use client";

import { useState } from "react";
import type { Dict } from "@/content/en";
import { clinic, whatsappLink } from "@/content/clinic";
import { WhatsAppGlyph } from "./ui/icons";
import s from "./ContactForm.module.css";

type Status = "idle" | "sending" | "sent" | "offline" | "error";

/**
 * Submissions go to the clinic's email through Formspree when NEXT_PUBLIC_FORMSPREE_ID is set.
 * Until then the form never pretends to send: it hands the same details to WhatsApp.
 */
export default function ContactForm({ t, services }: { t: Dict["contact"]["form"]; services: string[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState(false);
  const [waHref, setWaHref] = useState(whatsappLink(t.waIntro));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    if (!name || !phone) {
      setInvalid(true);
      (form.elements.namedItem(name ? "phone" : "name") as HTMLElement)?.focus();
      return;
    }
    setInvalid(false);

    const lines = [
      t.waIntro,
      `${t.waName}: ${name}`,
      `${t.waPhone}: ${phone}`,
      data.get("service") ? `${t.waService}: ${data.get("service")}` : "",
      data.get("time") ? `${t.waTime}: ${data.get("time")}` : "",
      data.get("message") ? `${t.waNote}: ${data.get("message")}` : "",
    ].filter(Boolean);
    setWaHref(whatsappLink(lines.join("\n")));

    if (!clinic.formspreeId) {
      setStatus("offline");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${clinic.formspreeId}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  const panel =
    status === "sent"
      ? { title: t.successTitle, text: t.successText }
      : status === "offline"
        ? { title: t.offlineTitle, text: t.offlineText }
        : status === "error"
          ? { title: t.errorTitle, text: t.errorText }
          : null;

  return (
    <div className={s.root}>
      <form className={`${s.form} ${panel ? s.hidden : ""}`} onSubmit={onSubmit} noValidate aria-hidden={!!panel}>
        <div className={s.row}>
          <label className={s.field}>
            <span>{t.name}</span>
            <input name="name" autoComplete="name" placeholder={t.namePh} required aria-invalid={invalid || undefined} />
          </label>
          <label className={s.field}>
            <span>{t.phone}</span>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={t.phonePh} required dir="ltr" aria-invalid={invalid || undefined} />
          </label>
        </div>
        <div className={s.row}>
          <label className={s.field}>
            <span>{t.service}</span>
            <select name="service" defaultValue="">
              <option value="" disabled>
                {t.servicePh}
              </option>
              {services.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
              <option value={t.serviceOther}>{t.serviceOther}</option>
            </select>
          </label>
          <label className={s.field}>
            <span>{t.time}</span>
            <input name="time" placeholder={t.timePh} />
          </label>
        </div>
        <label className={s.field}>
          <span>{t.message}</span>
          <textarea name="message" rows={3} placeholder={t.messagePh} />
        </label>
        {invalid && (
          <p className={s.error} role="alert">
            {t.required}
          </p>
        )}
        <button type="submit" className="btn btn-ink" disabled={status === "sending"}>
          {status === "sending" ? t.sending : t.submit}
        </button>
      </form>

      {panel && (
        <div className={s.panel} role="status">
          <p className={`font-display ${s.panelTitle}`}>{panel.title}</p>
          <p className={s.panelText}>{panel.text}</p>
          <a className="btn btn-primary" href={waHref} target="_blank" rel="noopener">
            <WhatsAppGlyph />
            {t.whatsapp}
          </a>
        </div>
      )}
    </div>
  );
}
