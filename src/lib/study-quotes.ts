/**
 * Verified, accurately attributed quotes plus practical study tips.
 * Anything that could not be traced to a real, documented source is not here.
 */
export type Quote = { quote: string; author: string };

export const STUDY_QUOTES: Quote[] = [
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { quote: "Nothing will work unless you do.", author: "Maya Angelou" },
  { quote: "You may encounter many defeats, but you must not be defeated.", author: "Maya Angelou" },
  { quote: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { quote: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { quote: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein" },
  { quote: "The only way to learn mathematics is to do mathematics.", author: "Paul Halmos" },
];

/** Evidence-backed study techniques, phrased as something you can do today. */
export const STUDY_TIPS: string[] = [
  "Test yourself before you reread. Retrieval practice beats highlighting almost every time.",
  "Space your revision out. Three 40-minute sessions across three days beat one two-hour cram.",
  "Mix topics in one sitting. Interleaving feels harder, and that is exactly why it sticks.",
  "Explain a concept out loud as if teaching it. Gaps in your understanding surface fast.",
  "Write your own questions from lecture slides, then answer them a day later.",
  "Sleep is revision. Memory consolidates overnight, so late all-nighters cost more than they add.",
  "Start with the topic you are avoiding. It is usually the one carrying the most marks.",
  "Review every wrong answer you get. The explanation is where the learning actually happens.",
];

export type Rotating = { kind: "quote"; quote: Quote } | { kind: "tip"; tip: string };

/** Interleaved quote/tip deck, shuffled so the Home card is different each open. */
export function buildRotatingDeck(): Rotating[] {
  const deck: Rotating[] = [
    ...STUDY_QUOTES.map((quote) => ({ kind: "quote" as const, quote })),
    ...STUDY_TIPS.map((tip) => ({ kind: "tip" as const, tip })),
  ];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
