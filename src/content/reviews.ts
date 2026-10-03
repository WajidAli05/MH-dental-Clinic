// Real Google reviews from the clinic's Google Maps listing (pasted 2026-10-02).
// Wording is the reviewer's own; only spacing and obvious run-together words were tidied,
// and two reviews truncated by Google ("… More") end at the last complete sentence.
// Only reviews with written text are kept. Dates are approximate (Google shows "a month ago").
// To refresh: paste new reviews and add them to the top of this list.

export type Review = { name: string; text: string; when: string };

export const reviews: Review[] = [
  {
    name: "Qadir Bakhsh",
    text: "I, Qadir Bakhsh Kalim, director of National Assembly and a resident of I-8/1 recently visited this clinic and had a great experience. The staff was very friendly and cooperative. The clinic was impressively clean and I appreciate the great service. Highly Recommend.",
    when: "2026-04",
  },
  {
    name: "Manii Rajpoot",
    text: "I had a wonderful experience visiting MH MEDICAL AND DENTAL CLINIC. From the moment I arrived, I was welcomed with warmth and professionalism. The clinic is modern and well-equipped, and the staff are highly knowledgeable and friendly, which makes every visit comfortable and pleasant.",
    when: "2026-04",
  },
  {
    name: "Muhammad Shahzad",
    text: "I visit the clinic the doctor was calm and patient. I am satisfied with this best dental clinic in Islamabad. Recomended",
    when: "2026-09",
  },
  {
    name: "Yaseen Bhatti",
    text: "Brilliant service. Very kind and polite reception and fair charges. Overall the experience was very good in my 2 visits.",
    when: "2026-04",
  },
  {
    name: "Ayesha Waheed",
    text: "My overall experience was good, Dr was so humble and the clinic was properly maintained.",
    when: "2026-09",
  },
  {
    name: "Raja ji",
    text: "Excellent clinical services! The staff is professional, friendly, and caring.",
    when: "2026-09",
  },
  {
    name: "Muhammad Usman",
    text: "Modern treatments. Comfortable experience. Friendly environment. Trusted dentists 👍",
    when: "2026-04",
  },
  {
    name: "Naseeb Ullah Chishti",
    text: "The best hundred percent recommended. Excellent services reasonable price.",
    when: "2026-04",
  },
  {
    name: "Abdul Rehman Chaudary",
    text: "I have had the opportunity to visit this establishment on two occasions, and I can attest to the exceptional professionalism and cooperative demeanor of the staff. The medical professionals also demonstrate a high level of expertise in their respective fields, and I am thoroughly satisfied with the services provided.",
    when: "2026-04",
  },
  {
    name: "Husnain Amjad",
    text: "It was a great experience here. All the doctors and staff are really professional.",
    when: "2026-04",
  },
  {
    name: "XYEDADNAN ALI JILLANI",
    text: "Their dental work is exceptional, and I am highly impressed by their expertise.",
    when: "2026-04",
  },
  { name: "Ayeshanoor Kirannouman", text: "Gentle staff environment", when: "2026-07" },
  { name: "Muhammad Zuhaib Khan", text: "One of the best clinic I have experienced", when: "2026-04" },
  { name: "Isma Ali", text: "Best ever experience 💫", when: "2026-09" },
  { name: "L E D HOUSE", text: "Best dental clinic in Islamabad", when: "2026-04" },
  { name: "danish ali", text: "You are best clinic", when: "2026-09" },
  { name: "Mishi Khan", text: "Great experience", when: "2026-09" },
  { name: "thecbfguyy", text: "Good staff", when: "2026-09" },
  { name: "Hamza Akram", text: "Very good 😊", when: "2026-07" },
];
