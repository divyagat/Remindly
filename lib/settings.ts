"use client";

import { useSyncExternalStore } from "react";
import type { ReminderKey } from "@/lib/reminder";

export interface Settings {
  /** Bedtime as "HH:mm"; the "night before" reminder is spoken at this time. */
  bedtime: string;
  /** Wake-up time as "HH:mm"; repeats for unfinished tasks are paused from bedtime until then. */
  wakeTime: string;
  /** Minutes between repeat reminders for overdue, unfinished tasks (0 = don't repeat). */
  repeatMinutes: number;
  /** Reminders pre-selected when adding a new task. */
  defaultReminders: ReminderKey[];
}

const STORAGE_KEY = "remindly.settings";

export const DEFAULT_SETTINGS: Settings = {
  bedtime: "22:00",
  wakeTime: "07:00",
  repeatMinutes: 15,
  defaultReminders: ["dayBefore", "nightBefore", "hourBefore", "fiveMinBefore", "atTime"],
};

let cache: Settings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  if (cache) {
    return cache;
  }
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache;
}

export function updateSettings(changes: Partial<Settings>) {
  cache = { ...getSettings(), ...changes };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Keep the in-memory copy.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
