"use client";

import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, Clock, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { chip, input, PRIORITY_STYLES, primaryButton, secondaryButton } from "@/components/ui";
import { formatTime, REMINDER_KINDS, type ReminderKey } from "@/lib/reminder";
import { parseWhen } from "@/lib/parse";
import { REPEAT_OPTIONS, repeatLabel, type Repeat } from "@/lib/repeat";
import { useSettings } from "@/lib/settings";
import { addTask, deleteTask, editTask, type Priority, type Task } from "@/lib/tasks";

interface TaskFormProps {
  task?: Task;
  onDone?: () => void;
  /** Pre-selected date ("yyyy-MM-dd") for a new task. */
  defaultDate?: string;
  /** Pre-selected time ("HH:mm") for a new task. */
  defaultTime?: string;
  autoFocus?: boolean;
  /** Show only the title box until the user starts typing (home screen quick add). */
  compact?: boolean;
}

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

/** Opens the browser's own date/time picker for an input hidden inside a chip. */
function openPicker(event: React.MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Older browsers open the picker on click anyway.
  }
}

const label = "text-xs font-semibold tracking-wide text-zinc-500 uppercase";

export default function TaskForm({ task, onDone, defaultDate, defaultTime, autoFocus, compact }: TaskFormProps) {
  const settings = useSettings();
  const due = task?.dueAt ? new Date(task.dueAt) : null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [date, setDate] = useState(due ? dateKey(due) : (defaultDate ?? ""));
  const [time, setTime] = useState(due ? format(due, "HH:mm") : (defaultTime ?? ""));
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [repeat, setRepeat] = useState<Repeat>(task?.repeat ?? "none");
  // null = not changed yet, so a new task uses the default reminders from Settings.
  const [chosenReminders, setChosenReminders] = useState<ReminderKey[] | null>(task?.reminders ?? null);
  const reminders = chosenReminders ?? settings.defaultReminders;
  // Extra options stay hidden to keep adding quick; open them if the task already uses them.
  const [showMore, setShowMore] = useState(
    Boolean(task && (task.notes || task.repeat !== "none" || task.priority !== "medium")),
  );

  const today = dateKey(new Date());
  const tomorrow = dateKey(addDays(new Date(), 1));
  // New tasks understand dates typed into the title ("Call mom tomorrow at 5pm"); anything
  // picked with the buttons below wins over what was typed.
  const typed = task ? null : parseWhen(title);
  const whenDate = date || typed?.date || "";
  const whenTime = time || typed?.time || "";
  const whenRepeat = repeat !== "none" ? repeat : (typed?.repeat ?? "none");
  const pickedOtherDate = whenDate !== "" && whenDate !== today && whenDate !== tomorrow;
  const expanded = !compact || title.trim() !== "";

  function toggleReminder(key: ReminderKey) {
    setChosenReminders(reminders.includes(key) ? reminders.filter((k) => k !== key) : [...reminders, key]);
  }

  function reset() {
    setTitle("");
    setNotes("");
    setDate(defaultDate ?? "");
    setTime(defaultTime ?? "");
    setPriority("medium");
    setRepeat("none");
    setChosenReminders(null);
    setShowMore(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    // A time (or a repeat) without a date means today; a date without a time means 9:00 AM.
    const dueDate = whenDate || (whenTime || whenRepeat !== "none" ? today : "");
    const dueAt = dueDate ? new Date(`${dueDate}T${whenTime || "09:00"}`).toISOString() : null;
    const values = {
      title: typed?.title ?? trimmed,
      notes: notes.trim(),
      priority,
      dueAt,
      reminders: REMINDER_KINDS.map((kind) => kind.key).filter((key) => reminders.includes(key)),
      repeat: whenRepeat,
    };
    if (task) {
      editTask(task.id, values);
    } else {
      addTask(values);
      reset();
    }
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <input
          aria-label="Task title"
          placeholder={task ? "Task" : "Add a task…"}
          required
          autoFocus={autoFocus}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && compact && reset()}
          enterKeyHint={task ? "done" : "enter"}
          className={`${input} min-w-0 py-3 text-base`}
        />
        {compact && (
          <button type="submit" aria-label="Add task" disabled={!expanded} className={`${primaryButton} shrink-0 px-3.5`}>
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {typed && typed.title !== title.trim() && (
        <p className="-mt-2 flex items-center gap-1.5 px-1 text-sm text-indigo-600 dark:text-indigo-400">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Saves as “{typed.title}”
            {typed.repeat && ` · ${repeatLabel(typed.repeat).toLowerCase()}`}
          </span>
        </p>
      )}

      {expanded && (
        <div className="animate-fade-in space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setDate(date === today ? "" : today)} className={chip(whenDate === today)}>
              Today
            </button>
            <button
              type="button"
              onClick={() => setDate(date === tomorrow ? "" : tomorrow)}
              className={chip(whenDate === tomorrow)}
            >
              Tomorrow
            </button>
            {/* The real date/time inputs sit invisibly on top of friendly chips. */}
            <span className={chip(pickedOtherDate)}>
              <CalendarDays className="h-4 w-4" />
              {pickedOtherDate ? format(parseISO(whenDate), "EEE d MMM") : "Pick date"}
              <input
                type="date"
                aria-label="Due date"
                value={date}
                onClick={openPicker}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </span>
            <span className={chip(Boolean(whenTime))}>
              <Clock className="h-4 w-4" />
              {whenTime ? formatTime(new Date(`2000-01-01T${whenTime}`)) : "Add time"}
              <input
                type="time"
                aria-label="Due time"
                value={time}
                onClick={openPicker}
                onChange={(e) => setTime(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </span>
            {time && (
              <button
                type="button"
                aria-label="Clear time"
                onClick={() => setTime("")}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMore((open) => !open)}
            className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            aria-expanded={showMore}
          >
            More options
            <ChevronDown className={`h-4 w-4 transition ${showMore ? "rotate-180" : ""}`} />
          </button>

          {showMore && (
            <div className="animate-fade-in space-y-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <div className="space-y-2">
                <p className={label}>Repeat</p>
                <div className="flex flex-wrap gap-2">
                  {REPEAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={whenRepeat === option.value}
                      onClick={() => setRepeat(option.value)}
                      className={chip(whenRepeat === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className={label}>Importance</p>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      className={chip(priority === level)}
                    >
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_STYLES[level].bar}`} />
                      {PRIORITY_STYLES[level].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className={label}>Remind me</p>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_KINDS.map((kind) => (
                    <button
                      key={kind.key}
                      type="button"
                      aria-pressed={reminders.includes(kind.key)}
                      onClick={() => toggleReminder(kind.key)}
                      className={chip(reminders.includes(kind.key))}
                    >
                      {kind.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                aria-label="Notes"
                placeholder="Notes (read out with the reminder)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${input} resize-none`}
              />
            </div>
          )}

          {!compact && (
            <div className="flex gap-2">
              <button type="submit" className={`${primaryButton} flex-1 py-3 text-base`}>
                {task ? "Save" : "Add task"}
              </button>
              {onDone && (
                <button type="button" onClick={onDone} className={`${secondaryButton} px-4`}>
                  Cancel
                </button>
              )}
              {task && (
                <button
                  type="button"
                  aria-label="Delete task"
                  onClick={() => {
                    deleteTask(task.id);
                    onDone?.();
                  }}
                  className={`${secondaryButton} px-3 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
