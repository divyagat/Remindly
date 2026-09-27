"use client";

import { useSyncExternalStore } from "react";
import type { ReminderKey } from "@/lib/reminder";

export interface Settings {
  /** Bedtime as "HH:mm"; tomorrow's tasks are read out at this time. */
  bedtime: string;
  /** Wake-up time as "HH:mm"; today's tasks are read out at this time. */
  wakeTime: string;
  /** Minutes between repeat reminders for overdue tasks; they repeat until the task is done. */
  repeatMinutes: number;
  /** Read out tomorrow's tasks at bedtime. */
  bedtimeSummary: boolean;
  /** Read out today's tasks at wake-up time. */
  morningSummary: boolean;
  /** Reminders pre-selected when adding a new task. */
  defaultReminders: ReminderKey[];
}

const STORAGE_KEY = "remindly.settings";

export const DEFAULT_SETTINGS: Settings = {
  bedtime: "22:00",
  wakeTime: "07:00",
  repeatMinutes: 15,
  bedtimeSummary: true,
  morningSummary: true,
  defaultReminders: ["dayBefore", "hourBefore", "fiveMinBefore", "atTime"],
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
    // Repeats used to have an "off" option; overdue tasks now always keep reminding.
    if (!(cache.repeatMinutes > 0)) {
      cache = { ...cache, repeatMinutes: DEFAULT_SETTINGS.repeatMinutes };
    }
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
