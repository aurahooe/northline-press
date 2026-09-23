import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function hourKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}`;
}

export function msUntilNextHour(date = new Date()) {
  const next = new Date(date);
  next.setUTCMinutes(60, 0, 0);
  return next.getTime() - date.getTime();
}

const BANK = [
  {
    kicker: "Field note",
    title: "The street after rain smells like copper.",
    body: "Someone left a bicycle unlocked against the rail. The chain is wet. Nobody takes it. That is the whole story.",
  },
  {
    kicker: "Dispatch",
    title: "A kitchen light at 2am is a kind of flag.",
    body: "If you walk far enough you start cataloguing windows. Lit, dark, television blue. The city keeps its own hours and does not ask yours.",
  },
  {
    kicker: "Margin",
    title: "Paper remembers the hand better than the screen does.",
    body: "A crease is a decision. A stain is a date. We keep typing because it is faster, and then wonder why nothing sticks.",
  },
  {
    kicker: "Weather",
    title: "Wind from the north, thin and honest.",
    body: "Coats come out a week too early. People pretend they planned it. The river does not pretend.",
  },
  {
    kicker: "Brief",
    title: "Three things on a table: a key, a stamp, a peach stone.",
    body: "None of them belong to the same afternoon. That is how rooms accumulate a life.",
  },
  {
    kicker: "Hour",
    title: "The clock on the wall is four minutes fast on purpose.",
    body: "The owner said it keeps people from missing trains. It also keeps people a little anxious. Both are useful.",
  },
  {
    kicker: "Letter",
    title: "Write the thing you would say if the room were smaller.",
    body: "Most public writing is shouted from a distance. The better kind is passed across a table and left there.",
  },
  {
    kicker: "Notice",
    title: "The baker opens at five. The square waits.",
    body: "First light is not poetic if you work in it. It is just the start of the list.",
  },
];

export function editionFor(key) {
  const n = [...key].reduce((a, c) => a + c.charCodeAt(0), 0);
  return BANK[n % BANK.length];
}
