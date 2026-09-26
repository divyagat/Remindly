"use client";

import { AlarmClock, BellRing, Check, Moon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import VoiceButton from "@/components/VoiceButton";
import { primaryButton } from "@/components/ui";
import { showNotification } from "@/lib/notifications";
import { describeWhen, eventLabel, pendingEvents, spokenText, type ReminderEvent } from "@/lib/reminder";
import { getSettings, useSettings } from "@/lib/settings";
import { getTasks, toggleTask, updateTask, useTasks } from "@/lib/tasks";
import { announce, canPlayAudio, isVoiceEnabled, unlockAudio } from "@/lib/voice";

// Safety net in case a timer was delayed (e.g. the computer was asleep).
const CHECK_INTERVAL_MS = 15_000;
// Longest delay setTimeout supports (~24.8 days).
const MAX_TIMEOUT_MS = 2_147_483_647;
// Reminders missed by more than this (app was closed) are shown but not spoken.
const SPEAK_IF_MISSED_WITHIN_MS = 30 * 60_000;

interface Popup {
  id: string;
  event: ReminderEvent;
  text: string;
}

/**
 * Fires reminders at their exact time while the app is open (works offline, since tasks
 * are stored on the device): in-app popup, system notification, chime and voice.
 */
export default function ReminderPopup() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const tasks = useTasks();
  const settings = useSettings();
  const checkRef = useRef<() => void>(() => {});

  // Set a timer for the next reminder so it fires on time. Rescheduled whenever tasks
  // or settings change (including right after a reminder fires).
  useEffect(() => {
    const now = Date.now();
    const next = pendingEvents(tasks, settings)[0];
    if (!next) {
      return;
    }
    const delay = Math.min(Math.max(next.at.getTime() - now, 0), MAX_TIMEOUT_MS);
    const timeout = window.setTimeout(() => checkRef.current(), delay);
    return () => window.clearTimeout(timeout);
  }, [tasks, settings]);

  useEffect(() => {
    function check() {
      const now = new Date();
      const due = pendingEvents(getTasks(), getSettings()).filter((event) => event.at <= now);
      if (due.length === 0) {
        return;
      }

      // Mark everything that went off as done, but only announce the latest reminder per
      // task (e.g. if the app was closed, don't repeat "1 day before" and "1 hour before").
      const latestPerTask = new Map<string, ReminderEvent>();
      for (const event of due) {
        const task = getTasks().find((t) => t.id === event.task.id)!;
        updateTask(
          task.id,
          event.key === "overdue"
            ? { lastNaggedAt: now.toISOString() }
            : { firedReminders: [...task.firedReminders, event.key] },
        );
        latestPerTask.set(task.id, event);
      }
      const events = [...latestPerTask.values()];

      const text = spokenText(events, now);
      const newPopups = events.map((event) => ({
        id: `${event.task.id}-${event.key}`,
        event,
        text: spokenText([event], now),
      }));
      // A newer reminder for the same task replaces its older popup.
      setPopups((current) => [
        ...current.filter((p) => !latestPerTask.has(p.event.task.id)),
        ...newPopups,
      ]);

      for (const popup of newPopups) {
        void showNotification(popup.event.task.title, `${eventLabel(popup.event.key)} · ${popup.text}`);
      }

      // "Still not done" reminders are always spoken, however late.
      const recent = events.some(
        (event) => event.key === "overdue" || now.getTime() - event.at.getTime() < SPEAK_IF_MISSED_WITHIN_MS,
      );
      if (recent && isVoiceEnabled()) {
        announce(text);
      }
    }

    // Browsers block sound until the user interacts with the page, so prepare
    // audio on the first click, tap or key press.
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    checkRef.current = check;
    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  function dismiss(id: string) {
    setPopups((current) => current.filter((popup) => popup.id !== id));
  }

  if (popups.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed right-4 bottom-20 left-4 z-50 flex max-h-[70vh] flex-col gap-3 overflow-y-auto md:bottom-6 md:left-auto md:w-96"
      role="alert"
    >
      {popups.length > 1 && (
        <button
          type="button"
          onClick={() => setPopups([])}
          className="self-end rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium text-white backdrop-blur"
        >
          Dismiss all ({popups.length})
        </button>
      )}
      {popups.map(({ id, event, text }) => {
        const { task } = event;
        const overdue = event.key === "overdue";
        const Icon = overdue ? AlarmClock : event.key === "nightBefore" ? Moon : BellRing;
        return (
          <div
            key={id}
            className={`animate-slide-up rounded-2xl border bg-white p-4 shadow-2xl dark:bg-zinc-900 ${
              overdue ? "border-rose-300 dark:border-rose-800" : "border-zinc-200 dark:border-zinc-700"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
                  overdue ? "bg-rose-600" : "bg-indigo-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    overdue ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {eventLabel(event.key)}
                </p>
                <p className="break-words font-semibold">{task.title}</p>
                {task.dueAt && (
                  <p className="text-sm text-zinc-500 first-letter:uppercase">{describeWhen(new Date(task.dueAt))}</p>
                )}
                {task.notes && (
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{task.notes}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(id)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!canPlayAudio() && (
              <p className="mt-2 text-xs text-zinc-500">Your browser blocked the sound. Press Play to hear it.</p>
            )}
            <div className="mt-3 flex gap-2">
              <VoiceButton text={text} />
              <button
                type="button"
                onClick={() => {
                  if (!task.completed) toggleTask(task.id);
                  dismiss(id);
                }}
                className={`${primaryButton} flex-1 py-2`}
              >
                <Check className="h-4 w-4" /> Mark as done
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
