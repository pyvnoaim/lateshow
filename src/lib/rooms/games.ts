/** The three ways a room picks. Pure, safe in the browser. */
export const GAMES = [
  {
    id: "swipe",
    name: "Swipe",
    time: "2 to 5 min",
    what: "Everyone swipes through picks. The first one you all like wins.",
  },
  { id: "bracket", name: "Bracket", time: "5 min", what: "8 titles, two at a time. Vote until one is left." },
  { id: "reel", name: "Reel", time: "3 min", what: "Everyone adds a mood or genre. Spin it, get 3 picks." },
] as const;
export type Game = (typeof GAMES)[number]["id"];
