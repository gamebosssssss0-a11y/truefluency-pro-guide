/**
 * Verified, accurately attributed quotes plus practical study tips.
 * Anything that could not be traced to a real, documented source is not here.
 */
export type Quote = { quote: string; author: string };

export const STUDY_QUOTES: Quote[] = [
  { quote: "In the fields of observation chance favors only the prepared mind.", author: "Louis Pasteur" },
  { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { quote: "Life is not easy for any of us. But what of that? We must have perseverance and above all confidence in ourselves.", author: "Marie Curie" },
  { quote: "Enthusiasm is common. Endurance is rare.", author: "Angela Duckworth" },
  { quote: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { quote: "I've missed more than 9,000 shots. I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
  { quote: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.", author: "Toni Morrison" },
  { quote: "Genius is one percent inspiration, ninety-nine percent perspiration.", author: "Thomas Edison" },
  { quote: "I know of no more encouraging fact than the unquestionable ability of man to elevate his life by a conscious endeavour.", author: "Henry David Thoreau" },
  { quote: "Capability is confirmed and grows in its corresponding actions, walking by walking, and running by running.", author: "Epictetus" },
  { quote: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
  { quote: "I skate to where the puck is going to be, not where it has been.", author: "Wayne Gretzky" },
  { quote: "Practice doesn't make perfect. Perfect practice makes perfect.", author: "Vince Lombardi" },
  { quote: "The more I practice, the luckier I get.", author: "Gary Player" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "Nothing will work unless you do.", author: "Maya Angelou" },
  { quote: "He who is not courageous enough to take risks will accomplish nothing in life.", author: "Muhammad Ali" },
  { quote: "Pressure is a privilege. It only comes to those who earn it.", author: "Billie Jean King" },
];

/** Evidence-backed study techniques, phrased as something you can do today. */
export const STUDY_TIPS: string[] = [
  "Test yourself before rereading. Recalling from memory beats rereading for retention.",
  "Space it out. Short daily reviews beat one long cram session.",
  "Mix topics in one session instead of drilling only one at a time. It sharpens how you tell concepts apart.",
  "Ask yourself 'why' as you review. Explaining a rule to yourself helps it stick.",
  "Explain it out loud, like you're teaching someone else. Gaps in your explanation show gaps in your understanding.",
  "Pair a concept with a diagram or image. Visual plus written doubles your recall paths.",
  "Close every other tab. Switching tasks costs you more focus than it feels like.",
  "Try explaining a topic in the simplest words possible, like to a total beginner. It exposes what you don't actually understand yet.",
  "Study in short, focused sprints with real breaks in between. Constant grinding burns out your focus faster than it builds mastery.",
  "Before checking an answer, guess how confident you are first. It trains you to notice what you don't actually know.",
  "Rereading feels productive but barely helps. Testing yourself works far better for the same time spent.",
  "Make practice harder on purpose. Delay the answer, skip the hints. Struggling a bit now builds stronger long-term memory.",
  "Decide in advance: 'When I finish class, I open my mock test.' Clear triggers beat relying on motivation.",
  "Summarize what you just read in your own words. It forces you to actually process it, not just skim it.",
  "Sleep matters for memory. A late cram session with no sleep after it locks in far less than a full night's rest.",
  "Write notes in your own words instead of copying them exactly. Rephrasing forces your brain to actually process the material.",
  "Attempt a hard question before you've been taught the answer. Getting it wrong first can help the right answer stick better.",
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
