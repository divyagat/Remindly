"use client";

import { useSyncExternalStore } from "react";
import { passedReminders, type ReminderKey } from "@/lib/reminder";
import { nextOccurrence, type Repeat } from "@/lib/repeat";
import { getSettings } from "@/lib/settings";

// Tasks live in the browser's localStorage so the app keeps working offline.

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  /** Due date/time as an ISO string, or null when the task has no deadline. */
  dueAt: string | null;
  /** Which reminders to give before `dueAt`. */
  reminders: ReminderKey[];
  /** Reminders that have already gone off (or were already past when the task was saved). */
  firedReminders: ReminderKey[];
  /** When the "still not done" reminder was last given for this overdue task. */
  lastNaggedAt: string | null;
  /** How the task comes back after it's done. */
  repeat: Repeat;
  /** For a finished repeating task: the id of the next occurrence it created. */
  nextId: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export type TaskInput = Pick<Task, "title" | "notes" | "priority" | "dueAt" | "reminders" | "repeat">;

const STORAGE_KEY = "remindly.tasks";
const EMPTY: Task[] = [];

let cache: Task[] | null = null;
const listeners = new Set<() => void>();

const LEGACY_MINUTES_TO_KEY: Record<number, ReminderKey> = {
  0: "atTime",
  5: "fiveMinBefore",
  15: "fiveMinBefore",
  60: "hourBefore",
  1440: "dayBefore",
};

/** Upgrades tasks saved by the earlier single-reminder version. */
function normalize(raw: Task & { remindMinutesBefore?: number | null; remindedAt?: string | null }): Task {
  if (Array.isArray(raw.reminders)) {
    raw.lastNaggedAt ??= null;
    raw.repeat ??= "none";
    raw.nextId ??= null;
    return raw;
  }
  const { remindMinutesBefore, remindedAt, ...rest } = raw;
  const key = remindMinutesBefore != null ? LEGACY_MINUTES_TO_KEY[remindMinutesBefore] ?? "atTime" : null;
  const reminders = key ? [key] : [];
  return {
    ...rest,
    reminders,
    firedReminders: remindedAt ? reminders : [],
    lastNaggedAt: null,
    repeat: "none",
    nextId: null,
  };
}

function read(): Task[] {
  if (cache) {
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(tasks: Task[]) {
  cache = tasks;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage full or blocked: keep the in-memory copy so the UI still works.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTasks(): Task[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function getTasks(): Task[] {
  return read();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** A task saved when already past due starts its "still not done" repeats from now. */
function repeatStart(dueAt: string | null): string | null {
  const now = new Date();
  return dueAt && new Date(dueAt) < now ? now.toISOString() : null;
}

export function addTask(input: TaskInput): Task {
  const task: Task = {
    ...input,
    id: newId(),
    firedReminders: passedReminders(input.reminders, input.dueAt, getSettings().bedtime),
    lastNaggedAt: repeatStart(input.dueAt),
    nextId: null,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  write([task, ...read()]);
  return task;
}

export function updateTask(id: string, changes: Partial<Task>) {
  write(read().map((task) => (task.id === id ? { ...task, ...changes } : task)));
}

export function editTask(id: string, input: TaskInput) {
  const existing = read().find((task) => task.id === id);
  const scheduleChanged =
    existing?.dueAt !== input.dueAt || existing?.reminders.join() !== input.reminders.join();
  // After a schedule change, upcoming reminders should fire again (but not ones already past).
  updateTask(
    id,
    scheduleChanged
      ? {
          ...input,
          firedReminders: passedReminders(input.reminders, input.dueAt, getSettings().bedtime),
          lastNaggedAt: repeatStart(input.dueAt),
        }
      : input,
  );
}

export function toggleTask(id: string) {
  const task = read().find((t) => t.id === id);
  if (!task) {
    return;
  }

  if (task.completed) {
    // Un-ticking: also remove the next occurrence it created, if that hasn't been done yet.
    const next = task.nextId ? read().find((t) => t.id === task.nextId) : undefined;
    write(
      read()
        .filter((t) => !(next && t.id === next.id && !next.completed))
        .map((t) =>
          t.id === id
            ? {
                ...t,
                completed: false,
                completedAt: null,
                nextId: null,
                // Un-ticking an overdue task shouldn't make it nag instantly.
                lastNaggedAt: repeatStart(t.dueAt),
              }
            : t,
        ),
    );
    return;
  }

  const completedAt = new Date().toISOString();
  if (task.repeat === "none" || !task.dueAt) {
    updateTask(id, { completed: true, completedAt });
    return;
  }

  // A repeating task: mark this one done and schedule the next occurrence.
  const dueAt = nextOccurrence(new Date(task.dueAt), task.repeat).toISOString();
  const next: Task = {
    ...task,
    id: newId(),
    dueAt,
    firedReminders: passedReminders(task.reminders, dueAt, getSettings().bedtime),
    lastNaggedAt: null,
    nextId: null,
    completed: false,
    completedAt: null,
    createdAt: completedAt,
  };
  write([next, ...read().map((t) => (t.id === id ? { ...t, completed: true, completedAt, nextId: next.id } : t))]);
}

export function deleteTask(id: string) {
  write(read().filter((task) => task.id !== id));
}

export function clearCompleted() {
  write(read().filter((task) => !task.completed));
}

export function isOverdue(task: Task, now: Date = new Date()): boolean {
  return !task.completed && task.dueAt !== null && new Date(task.dueAt) < now;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Soonest due first (tasks without a due date last), then by priority. */
export function sortByDue(a: Task, b: Task): number {
  const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
  const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
  if (aDue !== bDue) {
    return aDue - bDue;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}
