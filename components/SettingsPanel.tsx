"use client";

import { AlarmClock, Bell, Database, Moon, Volume2, WifiOff } from "lucide-react";
import { useReducer, useSyncExternalStore } from "react";
import NotificationPermission from "@/components/NotificationPermission";
import VoiceButton from "@/components/VoiceButton";
import { card, chip, input, secondaryButton } from "@/components/ui";
import { formatBedtime, REMINDER_KINDS } from "@/lib/reminder";
import { updateSettings, useSettings } from "@/lib/settings";
import { clearCompleted, useTasks } from "@/lib/tasks";
import { isVoiceEnabled, setVoiceEnabled, voiceSupported } from "@/lib/voice";

const noSubscription = () => () => {};

function Section({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section className={`${card} space-y-3 p-5`}>
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const hint = "text-sm text-zinc-600 dark:text-zinc-400";

export default function SettingsPanel() {
  const tasks = useTasks();
  const settings = useSettings();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const speechSupported = useSyncExternalStore(noSubscription, voiceSupported, () => true);
  const voiceOn = useSyncExternalStore(noSubscription, isVoiceEnabled, () => true);
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <div className="space-y-4">
      <Section icon={AlarmClock} title="Unfinished tasks">
        <p className={hint}>
          After a task&apos;s time has passed, keep reminding me out loud until I mark it done.
        </p>
        <select
          aria-label="Repeat reminders for unfinished tasks"
          value={settings.repeatMinutes}
          onChange={(e) => updateSettings({ repeatMinutes: Number(e.target.value) })}
          className={`${input} w-auto`}
        >
          <option value={0}>Don&apos;t repeat</option>
          {[5, 10, 15, 30, 60].map((minutes) => (
            <option key={minutes} value={minutes}>
              Every {minutes === 60 ? "hour" : `${minutes} minutes`}
            </option>
          ))}
        </select>
      </Section>

      <Section icon={Moon} title="Sleep time">
        <p className={hint}>
          At bedtime you hear a summary of tomorrow&apos;s tasks. Repeats for unfinished tasks stay quiet until you
          wake up.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="space-y-1 text-sm font-medium">
            <span>Bedtime</span>
            <input
              type="time"
              aria-label="Bedtime"
              value={settings.bedtime}
              onChange={(e) => e.target.value && updateSettings({ bedtime: e.target.value })}
              className={`${input} w-36`}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Wake-up</span>
            <input
              type="time"
              aria-label="Wake-up time"
              value={settings.wakeTime}
              onChange={(e) => e.target.value && updateSettings({ wakeTime: e.target.value })}
              className={`${input} w-36`}
            />
          </label>
        </div>
      </Section>

      <Section icon={Bell} title="Default reminders">
        <p className={hint}>Pre-selected when you add a new task. You can still change them per task.</p>
        <div className="flex flex-wrap gap-2">
          {REMINDER_KINDS.map((kind) => {
            const on = settings.defaultReminders.includes(kind.key);
            return (
              <button
                key={kind.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  updateSettings({
                    defaultReminders: on
                      ? settings.defaultReminders.filter((key) => key !== kind.key)
                      : REMINDER_KINDS.map((k) => k.key).filter(
                          (key) => key === kind.key || settings.defaultReminders.includes(key),
                        ),
                  })
                }
                className={chip(on)}
              >
                {kind.key === "nightBefore" ? `Night before · ${formatBedtime(settings.bedtime)}` : kind.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section icon={Volume2} title="Voice">
        <p className={hint}>
          A chime plays and the reminder is read aloud — what it is, when it&apos;s due and your notes. Browsers
          only allow sound after you&apos;ve clicked somewhere on the page, so click anywhere after opening Remindly.
        </p>
        {speechSupported ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={voiceOn}
                onChange={(e) => {
                  setVoiceEnabled(e.target.checked);
                  rerender();
                }}
                className="h-4 w-4 accent-indigo-600"
              />
              Speak reminders aloud
            </label>
            <VoiceButton
              text="Reminder: Doctor appointment, tomorrow at 10:00 AM. Remember: bring your reports."
              label="Test voice"
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">This browser doesn&apos;t support speech.</p>
        )}
      </Section>

      <Section icon={Bell} title="Notifications">
        <p className={hint}>Also show a system notification when a reminder goes off.</p>
        <NotificationPermission />
      </Section>

      <Section icon={WifiOff} title="Offline use">
        <p className={hint}>
          Your tasks are saved on this device, so Remindly works without internet. Reminders go off while Remindly
          is open in a tab or installed as an app. To install it, choose <strong>Install app</strong> (computer) or{" "}
          <strong>Add to Home screen</strong> (phone) from your browser menu.
        </p>
      </Section>

      <Section icon={Database} title="Data">
        <p className={hint}>
          {tasks.length} task{tasks.length === 1 ? "" : "s"} stored on this device.
        </p>
        <button
          type="button"
          disabled={completedCount === 0}
          onClick={() => {
            if (window.confirm(`Delete ${completedCount} completed task(s)?`)) {
              clearCompleted();
            }
          }}
          className={secondaryButton}
        >
          Clear {completedCount} completed task{completedCount === 1 ? "" : "s"}
        </button>
      </Section>
    </div>
  );
}
