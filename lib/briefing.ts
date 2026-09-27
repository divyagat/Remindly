"use client";

import { addDays, addHours, format, set, startOfDay, subDays } from "date-fns";
import { formatTime } from "@/lib/reminder";
import type { Settings } from "@/lib/settings";
import { isOverdue, sortByDue, type Task } from "@/lib/tasks";

// Daily spoken summaries: tomorrow's tasks at bedtime, today's tasks at wake-up.

export type BriefingKind = "night" | "morning";

export interface Briefing {
  kind: BriefingKind;
  /** The day whose tasks are read out. */
  day: Date;
  tasks: Task[];
  /** Overdue tasks from earlier days that still aren't done. */
  unfinished: Task[];
}

// A morning summary is still given if Remindly is first opened within this long after wake-up.
const MORNING_WINDOW_HOURS = 6;
const STATE_KEY = "remindly.briefings";
// How many tasks are read out one by one before "and N more".
const MAX_SPOKEN = 8;

type BriefingState = Partial<Record<BriefingKind, string>>;

function readState(): BriefingState {
  try {
    return JSON.parse(window.localStorage.getItem(STATE_KEY) ?? "{}") as BriefingState;
  } catch {
    return {};
  }
}

function markGiven(kind: BriefingKind, occurrence: Date) {
  try {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ ...readState(), [kind]: occurrence.toISOString() }),
    );
  } catch {
    // Not remembered: at worst the summary is repeated once.
  }
}

function atTime(day: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
}

/** The latest time today or yesterday at "HH:mm" that isn't after `now`. */
function latest(hhmm: string, now: Date): Date {
  const today = atTime(now, hhmm);
  return today <= now ? today : subDays(today, 1);
}

/** The next time at "HH:mm" after `now`. */
function upcoming(hhmm: string, now: Date): Date {
  const today = atTime(now, hhmm);
  return today > now ? today : addDays(today, 1);
}

/** Which summaries should be given right now (each at most once per day). */
function dueBriefings(now: Date, settings: Settings): { kind: BriefingKind; occurrence: Date }[] {
  const state = readState();
  const due: { kind: BriefingKind; occurrence: Date }[] = [];

  if (settings.bedtimeSummary) {
    const bedtime = latest(settings.bedtime, now);
    // Only between bedtime and wake-up; a missed bedtime summary isn't given the next day.
    if (now < upcoming(settings.wakeTime, bedtime) && state.night !== bedtime.toISOString()) {
      due.push({ kind: "night", occurrence: bedtime });
    }
  }

  if (settings.morningSummary) {
    const wake = latest(settings.wakeTime, now);
    if (now < addHours(wake, MORNING_WINDOW_HOURS) && state.morning !== wake.toISOString()) {
      due.push({ kind: "morning", occurrence: wake });
    }
  }
  return due;
}

/** When the next summary is due, so a timer can be set for it. */
export function nextBriefingAt(now: Date, settings: Settings): Date | null {
  const times: Date[] = [];
  if (settings.bedtimeSummary) times.push(upcoming(settings.bedtime, now));
  if (settings.morningSummary) times.push(upcoming(settings.wakeTime, now));
  return times.length ? new Date(Math.min(...times.map((time) => time.getTime()))) : null;
}

export function buildBriefing(kind: BriefingKind, tasks: Task[], now: Date, occurrence: Date = now): Briefing {
  // At bedtime we talk about the next day; a bedtime after midnight (e.g. 00:30) is already "tomorrow".
  const day =
    kind === "night"
      ? occurrence.getHours() < 12
        ? startOfDay(occurrence)
        : startOfDay(addDays(occurrence, 1))
      : startOfDay(occurrence);
  const dayEnd = addDays(day, 1);
  const open = tasks.filter((task) => !task.completed && task.dueAt);
  return {
    kind,
    day,
    tasks: open
      .filter((task) => {
        const due = new Date(task.dueAt!);
        return due >= day && due < dayEnd;
      })
      .sort(sortByDue),
    unfinished: open.filter((task) => new Date(task.dueAt!) < day && isOverdue(task, now)).sort(sortByDue),
  };
}

/** Finds summaries that are due, marks them as given and returns them. */
export function takeDueBriefings(tasks: Task[], settings: Settings, now: Date = new Date()): Briefing[] {
  return dueBriefings(now, settings).map(({ kind, occurrence }) => {
    markGiven(kind, occurrence);
    return buildBriefing(kind, tasks, now, occurrence);
  });
}

export function briefingTitle(briefing: Briefing): string {
  return briefing.kind === "night"
    ? `Tomorrow · ${format(briefing.day, "EEEE d MMM")}`
    : `Today · ${format(briefing.day, "EEEE d MMM")}`;
}

/** What is read aloud, e.g. "Good night. Tomorrow, Monday, you have 3 tasks. At 9:00 AM, …" */
export function briefingText(briefing: Briefing): string {
  const { kind, day, tasks, unfinished } = briefing;
  const when = kind === "night" ? `Tomorrow, ${format(day, "EEEE")},` : "Today";
  const parts = [kind === "night" ? "Good night." : "Good morning."];

  if (tasks.length === 0) {
    parts.push(kind === "night" ? "You have nothing planned for tomorrow." : "You have nothing planned for today.");
  } else {
    parts.push(`${when} you have ${tasks.length} task${tasks.length === 1 ? "" : "s"}.`);
    for (const task of tasks.slice(0, MAX_SPOKEN)) {
      parts.push(`At ${formatTime(new Date(task.dueAt!))}, ${task.title}.`);
    }
    if (tasks.length > MAX_SPOKEN) {
      parts.push(`And ${tasks.length - MAX_SPOKEN} more.`);
    }
  }

  if (unfinished.length > 0) {
    parts.push(
      `You also have ${unfinished.length} unfinished task${unfinished.length === 1 ? "" : "s"} from before: ${unfinished
        .slice(0, MAX_SPOKEN)
        .map((task) => task.title)
        .join(", ")}.`,
    );
  }
  if (kind === "night") {
    parts.push("Sleep well.");
  }
  return parts.join(" ");
}
