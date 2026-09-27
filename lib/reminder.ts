import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  set,
  subDays,
} from "date-fns";
import type { Task } from "@/lib/tasks";

// "nightBefore" is no longer offered: the bedtime summary reads out all of tomorrow's
// tasks instead. It stays in the type so tasks saved by older versions still load.
export type ReminderKey = "dayBefore" | "nightBefore" | "hourBefore" | "fiveMinBefore" | "atTime";

export const REMINDER_KINDS: { key: ReminderKey; label: string; short: string }[] = [
  { key: "dayBefore", label: "1 day before", short: "1 day" },
  { key: "hourBefore", label: "1 hour before", short: "1 hr" },
  { key: "fiveMinBefore", label: "5 min before", short: "5 min" },
  { key: "atTime", label: "At the time", short: "On time" },
];

export const ALL_REMINDER_KEYS = REMINDER_KINDS.map((kind) => kind.key);

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function formatBedtime(bedtime: string): string {
  const [hours, minutes] = bedtime.split(":").map(Number);
  return formatTime(set(new Date(), { hours, minutes }));
}

/** When a given reminder goes off for a task due at `due`, or null if it can't. */
export function reminderTimeFor(key: ReminderKey, due: Date, bedtime: string): Date | null {
  switch (key) {
    case "dayBefore":
      return subDays(due, 1);
    case "hourBefore":
      return new Date(due.getTime() - 60 * 60_000);
    case "fiveMinBefore":
      return new Date(due.getTime() - 5 * 60_000);
    case "atTime":
      return due;
    case "nightBefore": {
      const [hours, minutes] = bedtime.split(":").map(Number);
      // A bedtime after midnight (e.g. 00:30) belongs to the early hours of the due day.
      const day = hours < 12 ? due : subDays(due, 1);
      const at = set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
      return at < due ? at : null;
    }
  }
}

/** "overdue" = the repeating reminder for a task that's past due and still not done. */
export type EventKey = ReminderKey | "overdue";

export interface ReminderEvent {
  task: Task;
  key: EventKey;
  at: Date;
}

export interface ScheduleSettings {
  bedtime: string;
  repeatMinutes: number;
}

export function eventLabel(key: EventKey): string {
  return key === "overdue" ? "Still not done" : (REMINDER_KINDS.find((kind) => kind.key === key)?.label ?? "Reminder");
}

/**
 * When to repeat the reminder for an unfinished task next. It keeps repeating, day and
 * night, until the task is marked as done.
 */
export function nextOverdueAt(task: Task, settings: ScheduleSettings): Date | null {
  if (task.completed || !task.dueAt) {
    return null;
  }
  const from = task.lastNaggedAt ? new Date(task.lastNaggedAt) : new Date(task.dueAt);
  return new Date(from.getTime() + settings.repeatMinutes * 60_000);
}

/** Reminders that haven't gone off yet, for tasks that aren't done, soonest first. */
export function pendingEvents(tasks: Task[], settings: ScheduleSettings): ReminderEvent[] {
  const events: ReminderEvent[] = [];
  for (const task of tasks) {
    if (task.completed || !task.dueAt) {
      continue;
    }
    const due = new Date(task.dueAt);
    for (const key of task.reminders) {
      if (task.firedReminders.includes(key) || !ALL_REMINDER_KEYS.includes(key)) {
        continue;
      }
      const at = reminderTimeFor(key, due, settings.bedtime);
      if (at) {
        events.push({ task, key, at });
      }
    }
    const overdueAt = nextOverdueAt(task, settings);
    if (overdueAt) {
      events.push({ task, key: "overdue", at: overdueAt });
    }
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Reminder keys whose time has already passed (so they shouldn't fire for a new/edited task). */
export function passedReminders(
  reminders: ReminderKey[],
  dueAt: string | null,
  bedtime: string,
  now: Date = new Date(),
): ReminderKey[] {
  if (!dueAt) {
    return [];
  }
  const due = new Date(dueAt);
  return reminders.filter((key) => {
    const at = reminderTimeFor(key, due, bedtime);
    return at === null || at <= now;
  });
}

/** "in 5 minutes", "today at 3:00 PM", "tomorrow at 9:00 AM", "on Friday at 9:00 AM"… */
export function describeWhen(due: Date, now: Date = new Date()): string {
  const minutes = differenceInMinutes(due, now);
  if (minutes < -1) {
    const day = isToday(due) ? "today" : isYesterday(due) ? "yesterday" : format(due, "EEEE d MMMM");
    return `was due ${day} at ${formatTime(due)}`;
  }
  if (minutes <= 1) {
    return "now";
  }
  if (minutes < 60) {
    return `in ${minutes} minutes, at ${formatTime(due)}`;
  }
  if (minutes <= 90) {
    return `in 1 hour, at ${formatTime(due)}`;
  }
  if (isToday(due)) {
    return `today at ${formatTime(due)}`;
  }
  if (isTomorrow(due)) {
    return `tomorrow at ${formatTime(due)}`;
  }
  if (differenceInCalendarDays(due, now) < 7) {
    return `on ${format(due, "EEEE")} at ${formatTime(due)}`;
  }
  return `on ${format(due, "EEEE d MMMM")} at ${formatTime(due)}`;
}

function withNotes(task: Task): string {
  const notes = task.notes.trim();
  return notes ? ` Remember: ${notes.length > 200 ? `${notes.slice(0, 200)}…` : notes}.` : "";
}

/** The sentence(s) read aloud for reminders that went off together. */
export function spokenText(events: ReminderEvent[], now: Date = new Date()): string {
  const overdue = events.filter((event) => event.key === "overdue");
  const others = events.filter((event) => event.key !== "overdue");
  const parts: string[] = [];

  if (overdue.length === 1) {
    const { task } = overdue[0];
    parts.push(
      `You still haven't finished: ${task.title}. It ${describeWhen(new Date(task.dueAt!), now)}.${withNotes(task)}`,
    );
  } else if (overdue.length > 1) {
    parts.push(
      `You still have ${overdue.length} unfinished tasks: ${overdue.map((event) => event.task.title).join(", ")}.`,
    );
  }

  for (const { task, key } of others) {
    const due = new Date(task.dueAt!);
    parts.push(
      key === "atTime"
        ? `It's time: ${task.title}.${withNotes(task)}`
        : `Reminder: ${task.title}, ${describeWhen(due, now)}.${withNotes(task)}`,
    );
  }

  return parts.join(" ");
}
