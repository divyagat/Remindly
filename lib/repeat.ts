import { addDays, addMonths, addWeeks, isWeekend } from "date-fns";

export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
];

export function repeatLabel(repeat: Repeat): string {
  return REPEAT_OPTIONS.find((option) => option.value === repeat)?.label ?? "Never";
}

function advance(date: Date, repeat: Repeat): Date {
  switch (repeat) {
    case "daily":
      return addDays(date, 1);
    case "weekdays": {
      let next = addDays(date, 1);
      while (isWeekend(next)) next = addDays(next, 1);
      return next;
    }
    case "weekly":
      return addWeeks(date, 1);
    case "monthly":
      return addMonths(date, 1);
    case "none":
      return date;
  }
}

/**
 * The next time a repeating task is due, keeping its time of day. Missed occurrences
 * are skipped, so finishing yesterday's daily task schedules the next upcoming one.
 */
export function nextOccurrence(due: Date, repeat: Repeat, now: Date = new Date()): Date {
  let next = advance(due, repeat);
  while (next <= now) {
    next = advance(next, repeat);
  }
  return next;
}
