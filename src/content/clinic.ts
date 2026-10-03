// Facts shared by every language. Change a number here and the whole site follows.

export const clinic = {
  name: "MH Medical & Dental Clinic",
  doctor: "Dr Riaz Ahmed",
  phoneDisplay: "051-4444233",
  phoneHref: "tel:+92514444233",
  mobileDisplay: "+92 334 8694111",
  mobileHref: "tel:+923348694111",
  whatsappNumber: "923348694111",
  rating: 4.8,
  reviewCount: 60,
  mapsUrl:
    "https://www.google.com/maps/place/MH+medical+%26+dental+clinic/@33.662367,73.0670505,17z/data=!4m6!3m5!1s0x38df950037a0e0b7:0xaf199eb88510edbb!8m2!3d33.662367!4d73.0670505!16s%2Fg%2F11m6fzynq0",
  mapsEmbed:
    "https://www.google.com/maps?q=33.662367,73.0670505&z=17&output=embed",
  instagram: "https://www.instagram.com/mh_medical_and_dental_clinic/",
  facebook: "https://www.facebook.com/watch/?v=1504544751704621",
  // Formspree form id, e.g. "xyzabcd". Leave empty until the clinic creates the form;
  // the contact form then hands off to WhatsApp instead of pretending to send.
  formspreeId: process.env.NEXT_PUBLIC_FORMSPREE_ID ?? "",
} as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${clinic.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
