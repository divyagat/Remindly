"use client";

import { addDays, format } from "date-fns";
import { ChevronDown, Moon, Plus } from "lucide-react";
import { useState } from "react";
import { chip, input, PRIORITY_STYLES, primaryButton, secondaryButton } from "@/components/ui";
import { formatBedtime, REMINDER_KINDS, type ReminderKey } from "@/lib/reminder";
import { useSettings } from "@/lib/settings";
import { addTask, editTask, type Priority, type Task } from "@/lib/tasks";

interface TaskFormProps {
  task?: Task;
  onDone?: () => void;
}

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

export default function TaskForm({ task, onDone }: TaskFormProps) {
  const settings = useSettings();
  const due = task?.dueAt ? new Date(task.dueAt) : null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [date, setDate] = useState(due ? dateKey(due) : "");
  const [time, setTime] = useState(due ? format(due, "HH:mm") : "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  // null = not changed yet, so a new task uses the default reminders from Settings.
  const [chosenReminders, setChosenReminders] = useState<ReminderKey[] | null>(task?.reminders ?? null);
  const reminders = chosenReminders ?? settings.defaultReminders;
  // Extra options stay hidden for new tasks to keep adding quick.
  const [showMore, setShowMore] = useState(Boolean(task));

  const today = dateKey(new Date());
  const tomorrow = dateKey(addDays(new Date(), 1));
  const pickedOtherDate = date !== "" && date !== today && date !== tomorrow;

  function toggleReminder(key: ReminderKey) {
    setChosenReminders(reminders.includes(key) ? reminders.filter((k) => k !== key) : [...reminders, key]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    // A time without a date means today; a date without a time means 9:00 AM.
    const dueDate = date || (time ? today : "");
    const dueAt = dueDate ? new Date(`${dueDate}T${time || "09:00"}`).toISOString() : null;
    const values = {
      title: trimmed,
      notes: notes.trim(),
      priority,
      dueAt,
      reminders: REMINDER_KINDS.map((kind) => kind.key).filter((key) => reminders.includes(key)),
    };
    if (task) {
      editTask(task.id, values);
    } else {
      addTask(values);
      setTitle("");
      setNotes("");
      setDate("");
      setTime("");
      setPriority("medium");
      setChosenReminders(null);
      setShowMore(false);
    }
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        aria-label="Task title"
        placeholder="What do you need to remember?"
        required
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${input} py-3.5 text-base`}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">When?</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setDate(date === today ? "" : today)} className={chip(date === today)}>
            Today
          </button>
          <button
            type="button"
            onClick={() => setDate(date === tomorrow ? "" : tomorrow)}
            className={chip(date === tomorrow)}
          >
            Tomorrow
          </button>
          <input
            type="date"
            aria-label="Due date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${chip(pickedOtherDate)} py-1 [color-scheme:light] dark:[color-scheme:dark]`}
          />
          <input
            type="time"
            aria-label="Due time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`${chip(Boolean(time))} py-1`}
          />
        </div>
        {(date || time) && (
          <p className="text-xs text-zinc-500">
            {reminders.length > 0
              ? `🔔 Voice reminders: ${REMINDER_KINDS.filter((kind) => reminders.includes(kind.key))
                  .map((kind) => kind.label.toLowerCase())
                  .join(", ")}`
              : "🔕 No reminders"}
            {settings.repeatMinutes > 0 && ` — then every ${settings.repeatMinutes} min until it's done`}
          </p>
        )}
      </div>

      {!task && (
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          aria-expanded={showMore}
        >
          More options
          <ChevronDown className={`h-4 w-4 transition ${showMore ? "rotate-180" : ""}`} />
        </button>
      )}

      {showMore && (
        <div className="space-y-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
          <textarea
            aria-label="Notes"
            placeholder="Notes (read out with the reminder)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${input} resize-none`}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Importance</p>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <button key={level} type="button" onClick={() => setPriority(level)} className={chip(priority === level)}>
                  <span className={`h-2 w-2 rounded-full ${PRIORITY_STYLES[level].bar}`} />
                  {PRIORITY_STYLES[level].label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Remind me</p>
            <div className="flex flex-wrap gap-2">
              {REMINDER_KINDS.map((kind) => (
                <button
                  key={kind.key}
                  type="button"
                  aria-pressed={reminders.includes(kind.key)}
                  onClick={() => toggleReminder(kind.key)}
                  className={chip(reminders.includes(kind.key))}
                >
                  {kind.key === "nightBefore" && <Moon className="h-3 w-3" />}
                  {kind.key === "nightBefore" ? `Night before · ${formatBedtime(settings.bedtime)}` : kind.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className={`${primaryButton} flex-1 py-3 text-base`}>
          {task ? (
            "Save"
          ) : (
            <>
              <Plus className="h-5 w-5" /> Add
            </>
          )}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={secondaryButton}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
