import { addDays, addMinutes, format, set, startOfDay } from "date-fns";
import type { Repeat } from "@/lib/repeat";

// Understands dates and times typed into a task title, e.g. "Call mom tomorrow at 5pm",
// "Gym every monday 7am" or "Take medicine in 2 hours".

export interface ParsedWhen {
  /** The title with the date/time words taken out. */
  title: string;
  /** "yyyy-MM-dd" */
  date?: string;
  /** "HH:mm" */
  time?: string;
  repeat?: Repeat;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const SHORT_WEEKDAYS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
};
const MONTH =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const PARTS_OF_DAY: Record<string, string> = { morning: "09:00", afternoon: "14:00", evening: "18:00" };
// Stops a match from running into the next word ("5pm" but not "5pmx").
const END = "(?![a-z0-9])";

const pad = (n: number) => String(n).padStart(2, "0");

function weekdayIndex(word: string): number {
  const lower = word.toLowerCase();
  const full = WEEKDAYS.indexOf(lower);
  return full >= 0 ? full : SHORT_WEEKDAYS[lower];
}

function nextWeekday(now: Date, index: number, allowToday: boolean): Date {
  const today = startOfDay(now);
  let diff = (index - today.getDay() + 7) % 7;
  if (diff === 0 && !allowToday) diff = 7;
  return addDays(today, diff);
}

/** An hour typed without am/pm: 1–7 are taken as afternoon/evening, 8–11 as morning. */
function guessHour(hour: number): number {
  return hour >= 1 && hour <= 7 ? hour + 12 : hour;
}

export function parseWhen(input: string, now: Date = new Date()): ParsedWhen {
  let text = input;
  let date: Date | undefined;
  let time: string | undefined;
  let partOfDay: string | undefined;
  let repeat: Repeat | undefined;

  /** Runs a pattern; if the handler accepts the match, the words are removed from the title. */
  function take(pattern: RegExp, handle: (match: RegExpMatchArray) => boolean | void) {
    const match = text.match(pattern);
    if (!match || match.index === undefined || handle(match) === false) return;
    text = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
  }

  // Repeats.
  take(new RegExp(`\\bevery\\s+(${WEEKDAYS.join("|")})s?${END}`, "i"), (m) => {
    repeat = "weekly";
    date = nextWeekday(now, weekdayIndex(m[1]), true);
  });
  take(new RegExp(`\\b(?:every\\s*day|daily)${END}`, "i"), () => void (repeat ??= "daily"));
  take(new RegExp(`\\b(?:every\\s+weekdays?|on\\s+weekdays|weekdays)${END}`, "i"), () => void (repeat ??= "weekdays"));
  take(new RegExp(`\\b(?:every\\s+week|weekly)${END}`, "i"), () => void (repeat ??= "weekly"));
  take(new RegExp(`\\b(?:every\\s+month|monthly)${END}`, "i"), () => void (repeat ??= "monthly"));

  // "in 20 minutes", "in an hour", "in half an hour", "in 3 days".
  take(
    new RegExp(`\\bin\\s+(\\d+|an?|one|half\\s+an?)\\s+(minutes?|mins?|hours?|hrs?|days?|weeks?)${END}`, "i"),
    (m) => {
      const amount = /^half/i.test(m[1]) ? 0.5 : /^\d/.test(m[1]) ? Number(m[1]) : 1;
      const unit = m[2].toLowerCase();
      if (unit.startsWith("min") || unit.startsWith("h")) {
        const at = addMinutes(now, amount * (unit.startsWith("min") ? 1 : 60));
        date = at;
        time = format(at, "HH:mm");
      } else {
        date = addDays(startOfDay(now), amount * (unit.startsWith("w") ? 7 : 1));
      }
    },
  );

  // Days.
  take(new RegExp(`\\bday\\s+after\\s+tomorrow${END}`, "i"), () => void (date = addDays(startOfDay(now), 2)));
  take(new RegExp(`\\b(?:tomorrow|tomorow|tmrw|tmr)${END}`, "i"), () => void (date = addDays(startOfDay(now), 1)));
  take(new RegExp(`\\btonight${END}`, "i"), () => {
    date ??= startOfDay(now);
    partOfDay = "20:00";
  });
  take(new RegExp(`\\btoday${END}`, "i"), () => void (date ??= startOfDay(now)));
  take(new RegExp(`\\b(?:(on|next|this)\\s+)?(${WEEKDAYS.join("|")})${END}`, "i"), (m) => {
    if (date) return false;
    date = nextWeekday(now, weekdayIndex(m[2]), m[1]?.toLowerCase() === "this");
  });
  // Short day names only after "on"/"next"/"this", so "sat" or "wed" in a title is left alone.
  take(new RegExp(`\\b(on|next|this)\\s+(${Object.keys(SHORT_WEEKDAYS).join("|")})${END}`, "i"), (m) => {
    if (date) return false;
    date = nextWeekday(now, weekdayIndex(m[2]), m[1].toLowerCase() === "this");
  });

  // Dates: "12 oct", "12th of October", "oct 12".
  function setDayOfMonth(day: number, monthWord: string): boolean {
    const month = MONTHS.indexOf(monthWord.slice(0, 3).toLowerCase());
    let candidate = new Date(now.getFullYear(), month, day);
    if (candidate.getMonth() !== month || date) return false;
    if (candidate < startOfDay(now)) candidate = new Date(now.getFullYear() + 1, month, day);
    date = candidate;
    return true;
  }
  take(new RegExp(`\\b(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}${END}`, "i"), (m) =>
    setDayOfMonth(Number(m[1]), m[2]),
  );
  take(new RegExp(`\\b(?:on\\s+)?${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?${END}`, "i"), (m) =>
    setDayOfMonth(Number(m[2]), m[1]),
  );

  // Times: "5pm", "at 5:30 pm", "7.15am".
  take(new RegExp(`(?:\\b(?:at|by)\\s+|@\\s*|\\b)(\\d{1,2})(?:[:.](\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)(?![a-z])`, "i"), (m) => {
    const hour = Number(m[1]);
    const minutes = Number(m[2] ?? 0);
    if (time || hour < 1 || hour > 12 || minutes > 59) return false;
    const pm = m[3].toLowerCase().startsWith("p");
    time = `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minutes)}`;
  });
  // "at 5", "at 17:30", "by 9".
  take(new RegExp(`(?:\\b(?:at|by)\\s+|@\\s*)(\\d{1,2})(?:[:.](\\d{2}))?${END}`, "i"), (m) => {
    const hour = Number(m[1]);
    const minutes = Number(m[2] ?? 0);
    if (time || hour > 23 || minutes > 59) return false;
    time = `${pad(guessHour(hour))}:${pad(minutes)}`;
  });
  // "17:30" or "9:15" on its own.
  take(new RegExp(`\\b(\\d{1,2}):(\\d{2})${END}`, "i"), (m) => {
    const hour = Number(m[1]);
    const minutes = Number(m[2]);
    if (time || hour > 23 || minutes > 59) return false;
    time = `${pad(guessHour(hour))}:${pad(minutes)}`;
  });
  take(new RegExp(`\\b(?:at\\s+)?(?:noon|midday)${END}`, "i"), () => {
    if (time) return false;
    time = "12:00";
  });
  take(new RegExp(`\\b(?:in\\s+the\\s+|this\\s+)?(morning|afternoon|evening)${END}`, "i"), (m) => {
    partOfDay ??= PARTS_OF_DAY[m[1].toLowerCase()];
  });
  take(new RegExp(`\\bat\\s+night${END}`, "i"), () => void (partOfDay ??= "20:00"));

  time ??= partOfDay;

  // A time with no day: today, or tomorrow if that time has already passed.
  if (time && !date) {
    const [hours, minutes] = time.split(":").map(Number);
    const today = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
    date = today > now ? startOfDay(now) : addDays(startOfDay(now), 1);
  }

  if (!date && !time && !repeat) {
    return { title: input.trim() };
  }

  let title = text.replace(/\s+/g, " ").trim();
  // Tidy words left dangling where the date was taken out ("Call mom at" → "Call mom").
  for (let previous = ""; previous !== title; ) {
    previous = title;
    title = title
      .replace(/^(?:at|on|by|in|for|and|,|-)\s+/i, "")
      .replace(/\s+(?:at|on|by|in|for|and|from)$/i, "")
      .replace(/[\s,;:-]+$/, "")
      .trim();
  }

  return {
    title: title || input.trim(),
    date: date ? format(date, "yyyy-MM-dd") : undefined,
    time,
    repeat,
  };
}
