"use client";

import { set } from "date-fns";
import { Download, Upload, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import NotificationPermission from "@/components/NotificationPermission";
import { card, chip, input } from "@/components/ui";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { buildBriefing, briefingText } from "@/lib/briefing";
import { REMINDER_KINDS } from "@/lib/reminder";
import { updateSettings, useSettings } from "@/lib/settings";
import { clearCompleted, useTasks } from "@/lib/tasks";
import { announce, setVoiceEnabled, useVoiceEnabled, voiceSupported } from "@/lib/voice";

const noSubscription = () => () => {};

function todayAt(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
}

/** An on/off switch. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-zinc-500">{title}</h2>
      <div className={`${card} divide-y divide-zinc-100 dark:divide-zinc-800`}>{children}</div>
    </section>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {hint && <p className="text-sm text-zinc-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function PlayButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => announce(text)}
      className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}

export default function SettingsPanel() {
  const tasks = useTasks();
  const settings = useSettings();
  const speechSupported = useSyncExternalStore(noSubscription, voiceSupported, () => true);
  const voiceOn = useVoiceEnabled();
  const completedCount = tasks.filter((task) => task.completed).length;
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const summaries = [
    {
      kind: "morning",
      title: "Morning summary",
      hint: "Hear today's tasks when you wake up",
      time: settings.wakeTime,
      setTime: (value: string) => updateSettings({ wakeTime: value }),
      on: settings.morningSummary,
      toggle: (value: boolean) => updateSettings({ morningSummary: value }),
    },
    {
      kind: "night",
      title: "Bedtime summary",
      hint: "Hear tomorrow's tasks before bed",
      time: settings.bedtime,
      setTime: (value: string) => updateSettings({ bedtime: value }),
      on: settings.bedtimeSummary,
      toggle: (value: boolean) => updateSettings({ bedtimeSummary: value }),
    },
  ] as const;

  return (
    <div className="space-y-8">
      <Group title="Reminders">
        {speechSupported && (
          <Row title="Voice reminders" hint={voiceOn ? "A chime, then the task is read out" : "Off: reminders only pop up, silently"}>
            <div className="flex items-center gap-1">
              <PlayButton
                label="Test voice"
                text="Reminder: Doctor appointment, tomorrow at 10:00 AM. Remember: bring your reports."
              />
              <Switch
                label="Speak reminders aloud"
                on={voiceOn}
                onChange={setVoiceEnabled}
              />
            </div>
          </Row>
        )}
        <Row title="Remind me again when overdue" hint="Keeps saying the task out loud until you mark it done">
          <select
            aria-label="Repeat reminders for unfinished tasks"
            value={settings.repeatMinutes}
            onChange={(e) => updateSettings({ repeatMinutes: Number(e.target.value) })}
            className={`${input} w-auto py-2`}
          >
            {[5, 10, 15, 30, 60].map((minutes) => (
              <option key={minutes} value={minutes}>
                Every {minutes === 60 ? "hour" : `${minutes} min`}
              </option>
            ))}
          </select>
        </Row>
        <div className="space-y-2.5 px-4 py-3.5 sm:px-5">
          <div>
            <p className="font-medium">New tasks remind me</p>
            <p className="text-sm text-zinc-500">You can still change this for each task</p>
          </div>
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
                  {kind.label}
                </button>
              );
            })}
          </div>
        </div>
        <Row title="Notifications" hint="Also show a pop-up from your system">
          <NotificationPermission />
        </Row>
      </Group>

      <Group title="Daily summary">
        {summaries.map(({ kind, title, hint, time, setTime, on, toggle }) => (
          <Row key={kind} title={title} hint={hint}>
            <div className="flex items-center gap-1">
              {speechSupported && (
                <PlayButton
                  label={`Hear ${title.toLowerCase()}`}
                  text={briefingText(
                    buildBriefing(kind, tasks, new Date(), kind === "night" ? todayAt(settings.bedtime) : new Date()),
                  )}
                />
              )}
              <input
                type="time"
                aria-label={kind === "night" ? "Bedtime" : "Wake-up time"}
                value={time}
                onChange={(e) => e.target.value && setTime(e.target.value)}
                className={`${input} mr-2 w-auto py-2 [color-scheme:light] dark:[color-scheme:dark]`}
              />
              <Switch label={title} on={on} onChange={toggle} />
            </div>
          </Row>
        ))}
      </Group>

      <Group title="Your data">
        <Row title="Back up" hint="Save all tasks and settings to a file">
          <button
            type="button"
            onClick={downloadBackup}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </Row>
        <Row
          title="Restore"
          hint={restoreMessage ?? "Load a backup file, e.g. on a new phone or computer. Your current tasks are kept."}
        >
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
            <Upload className="h-4 w-4" /> Choose file
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const count = await restoreBackup(file);
                  setRestoreMessage(`✓ Restored ${count} task${count === 1 ? "" : "s"}.`);
                } catch (error) {
                  setRestoreMessage(`✗ ${(error as Error).message}`);
                }
              }}
            />
          </label>
        </Row>
        <Row
          title="Completed tasks"
          hint={`${tasks.length} task${tasks.length === 1 ? "" : "s"} saved on this device, ${completedCount} done`}
        >
          <button
            type="button"
            disabled={completedCount === 0}
            onClick={() => {
              if (window.confirm(`Delete ${completedCount} completed task(s)?`)) {
                clearCompleted();
              }
            }}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:text-zinc-400 disabled:hover:bg-transparent dark:text-rose-400 dark:hover:bg-rose-950"
          >
            Clear
          </button>
        </Row>
      </Group>

      <p className="px-1 text-sm text-zinc-500">
        Remindly works offline. Reminders go off while it&apos;s open in a tab or installed as an app — use{" "}
        <strong>Install app</strong> or <strong>Add to Home screen</strong> from your browser menu. Browsers only
        play sound after you&apos;ve tapped the page once.
      </p>
    </div>
  );
}
