"use client";

import { addDays, set } from "date-fns";
import { AlarmClock, AlarmClockOff, BellRing, Check, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import VoiceButton from "@/components/VoiceButton";
import { primaryButton } from "@/components/ui";
import { briefingText, briefingTitle, nextBriefingAt, takeDueBriefings, type Briefing } from "@/lib/briefing";
import { showNotification } from "@/lib/notifications";
import {
  describeWhen,
  eventLabel,
  formatTime,
  pendingEvents,
  spokenText,
  type ReminderEvent,
} from "@/lib/reminder";
import { getSettings, useSettings } from "@/lib/settings";
import { getTasks, snoozeTask, toggleTask, updateTask, useTasks } from "@/lib/tasks";
import { announce, canPlayAudio, isVoiceEnabled, stopSpeaking, unlockAudio } from "@/lib/voice";

// Safety net in case a timer was delayed (e.g. the computer was asleep).
const CHECK_INTERVAL_MS = 15_000;
// Longest delay setTimeout supports (~24.8 days).
const MAX_TIMEOUT_MS = 2_147_483_647;
// Reminders missed by more than this (app was closed) are shown but not spoken.
const SPEAK_IF_MISSED_WITHIN_MS = 30 * 60_000;

/** "Remind me in…" choices on a reminder popup; "Tomorrow" means tomorrow at wake-up time. */
function snoozeOptions(wakeTime: string): { label: string; until: () => Date }[] {
  const [hours, minutes] = wakeTime.split(":").map(Number);
  return [
    { label: "10 min", until: () => new Date(Date.now() + 10 * 60_000) },
    { label: "30 min", until: () => new Date(Date.now() + 30 * 60_000) },
    { label: "1 hour", until: () => new Date(Date.now() + 60 * 60_000) },
    {
      label: "Tomorrow",
      until: () => set(addDays(new Date(), 1), { hours, minutes, seconds: 0, milliseconds: 0 }),
    },
  ];
}

type Popup = { id: string; text: string } & (
  | { event: ReminderEvent; briefing?: undefined }
  | { briefing: Briefing; event?: undefined }
);

/**
 * Fires reminders at their exact time while the app is open (works offline, since tasks
 * are stored on the device): in-app popup, system notification, chime and voice. Also
 * gives the bedtime (tomorrow's tasks) and wake-up (today's tasks) summaries.
 */
export default function ReminderPopup() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const tasks = useTasks();
  const settings = useSettings();
  const checkRef = useRef<() => void>(() => {});

  // Set a timer for the next reminder or summary so it fires on time. Rescheduled
  // whenever tasks or settings change (including right after a reminder fires).
  useEffect(() => {
    const now = new Date();
    const times = [pendingEvents(tasks, settings)[0]?.at, nextBriefingAt(now, settings)].filter(
      (time): time is Date => Boolean(time),
    );
    if (times.length === 0) {
      return;
    }
    const next = Math.min(...times.map((time) => time.getTime()));
    const delay = Math.min(Math.max(next - now.getTime(), 0), MAX_TIMEOUT_MS);
    const timeout = window.setTimeout(() => checkRef.current(), delay);
    return () => window.clearTimeout(timeout);
  }, [tasks, settings]);

  useEffect(() => {
    function check() {
      const now = new Date();
      const briefings = takeDueBriefings(getTasks(), getSettings(), now);
      const due = pendingEvents(getTasks(), getSettings()).filter((event) => event.at <= now);
      if (due.length === 0 && briefings.length === 0) {
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
            ? { lastNaggedAt: now.toISOString(), snoozedUntil: null }
            : event.key === "snooze"
              ? { snoozedUntil: null }
              : { firedReminders: [...task.firedReminders, event.key] },
        );
        latestPerTask.set(task.id, event);
      }
      const events = [...latestPerTask.values()];

      const briefingPopups: Popup[] = briefings.map((briefing) => ({
        id: `briefing-${briefing.kind}`,
        briefing,
        text: briefingText(briefing),
      }));
      const eventPopups: Popup[] = events.map((event) => ({
        id: `${event.task.id}-${event.key}`,
        event,
        text: spokenText([event], now),
      }));
      const newIds = new Set([...briefingPopups, ...eventPopups].map((popup) => popup.id));
      // A newer reminder for the same task (or a new summary) replaces the older popup.
      setPopups((current) => [
        ...current.filter(
          (p) => !newIds.has(p.id) && !(p.event && latestPerTask.has(p.event.task.id)),
        ),
        ...briefingPopups,
        ...eventPopups,
      ]);

      for (const popup of briefingPopups) {
        void showNotification(briefingTitle(popup.briefing!), popup.text);
      }
      for (const popup of eventPopups) {
        void showNotification(
          popup.event!.task.title,
          `${eventLabel(popup.event!.key)} · ${popup.text}`,
          popup.event!.key === "overdue",
        );
      }

      // "Still not done" reminders and summaries are always spoken; other reminders
      // only if they aren't long past (e.g. the app was closed at the time).
      const recent = events.some(
        (event) => event.key === "overdue" || now.getTime() - event.at.getTime() < SPEAK_IF_MISSED_WITHIN_MS,
      );
      const speech = [
        ...briefingPopups.map((popup) => popup.text),
        ...(recent ? [spokenText(events, now)] : []),
      ].join(" ");
      if (speech.trim() && isVoiceEnabled()) {
        announce(speech);
      }
    }

    // Browsers block sound until the user interacts with the page, so prepare
    // audio on the first click, tap or key press.
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

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

  // "Still not done" popups stay until the task is marked as done (here or in the task list).
  const isOverduePopup = (popup: Popup) => popup.event?.key === "overdue";
  const visible = popups.filter(
    (popup) => !isOverduePopup(popup) || tasks.some((t) => t.id === popup.event!.task.id && !t.completed),
  );
  const dismissable = visible.filter((popup) => !isOverduePopup(popup));

  if (visible.length === 0) {
    return null;
  }

  const dismissButton = (id: string) => (
    <button
      type="button"
      aria-label="Dismiss"
      onClick={() => dismiss(id)}
      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <X className="h-4 w-4" />
    </button>
  );
  const blockedHint = !canPlayAudio() && (
    <p className="mt-2 text-xs text-zinc-500">Your browser blocked the sound. Press Play to hear it.</p>
  );

  return (
    <div
      className="fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 z-50 mx-auto flex max-h-[70dvh] max-w-md flex-col gap-3 overflow-y-auto sm:right-4 sm:left-4 md:right-6 md:bottom-6 md:left-auto md:mx-0 md:w-96"
      role="alert"
    >
      {dismissable.length > 1 && (
        <button
          type="button"
          onClick={() => setPopups((current) => current.filter(isOverduePopup))}
          className="self-end rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium text-white backdrop-blur"
        >
          Dismiss all ({dismissable.length})
        </button>
      )}
      {visible.map((popup) => {
        if (popup.briefing) {
          const { briefing } = popup;
          const night = briefing.kind === "night";
          const Icon = night ? Moon : Sun;
          return (
            <div
              key={popup.id}
              className="animate-slide-up rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
                    night ? "bg-violet-600" : "bg-amber-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold tracking-wide uppercase ${
                      night ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {night ? "Good night" : "Good morning"}
                  </p>
                  <p className="font-semibold">{briefingTitle(briefing)}</p>
                  {briefing.tasks.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nothing planned.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {briefing.tasks.slice(0, 6).map((task) => (
                        <li key={task.id} className="flex gap-2">
                          <span className="w-16 shrink-0 font-semibold text-zinc-500 tabular-nums">
                            {formatTime(new Date(task.dueAt!))}
                          </span>
                          <span className="min-w-0 truncate">{task.title}</span>
                        </li>
                      ))}
                      {briefing.tasks.length > 6 && (
                        <li className="text-zinc-500">+{briefing.tasks.length - 6} more</li>
                      )}
                    </ul>
                  )}
                  {briefing.unfinished.length > 0 && (
                    <p className="mt-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">
                      {briefing.unfinished.length} unfinished from before
                    </p>
                  )}
                </div>
                {dismissButton(popup.id)}
              </div>
              {blockedHint}
              <div className="mt-3 flex gap-2">
                <VoiceButton text={popup.text} />
                <button type="button" onClick={() => dismiss(popup.id)} className={`${primaryButton} flex-1 py-2`}>
                  <Check className="h-4 w-4" /> Got it
                </button>
              </div>
            </div>
          );
        }

        const { event } = popup;
        const { task } = event;
        const overdue = event.key === "overdue";
        const Icon = overdue ? AlarmClock : BellRing;
        return (
          <div
            key={popup.id}
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
              {!overdue && dismissButton(popup.id)}
            </div>
            {blockedHint}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
                <AlarmClockOff className="h-3.5 w-3.5" /> Remind me in
              </span>
              {snoozeOptions(settings.wakeTime).map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    snoozeTask(task.id, option.until());
                    stopSpeaking();
                    dismiss(popup.id);
                  }}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <VoiceButton text={popup.text} />
              <button
                type="button"
                onClick={() => {
                  if (tasks.some((t) => t.id === task.id && !t.completed)) toggleTask(task.id);
                  stopSpeaking();
                  dismiss(popup.id);
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
