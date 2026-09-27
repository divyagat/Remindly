"use client";

import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { Bell, Check, Repeat2 } from "lucide-react";
import { useState } from "react";
import TaskForm from "@/components/TaskForm";
import { card } from "@/components/ui";
import { formatTime } from "@/lib/reminder";
import { repeatLabel } from "@/lib/repeat";
import { isOverdue, toggleTask, type Task } from "@/lib/tasks";

function dayLabel(due: Date): string {
  if (isToday(due)) return "Today";
  if (isTomorrow(due)) return "Tomorrow";
  if (isYesterday(due)) return "Yesterday";
  return format(due, "EEE d MMM");
}

interface TaskCardProps {
  task: Task;
  /** Show the day next to the time; off inside lists already grouped by day. */
  showDay?: boolean;
}

export default function TaskCard({ task, showDay = true }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const overdue = isOverdue(task);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const remindersLeft = task.reminders.some((key) => !task.firedReminders.includes(key));

  if (editing) {
    return (
      <li className={`${card} animate-slide-up p-4 shadow-sm sm:p-5`}>
        <TaskForm task={task} onDone={() => setEditing(false)} />
      </li>
    );
  }

  const when = due ? (showDay || overdue ? `${dayLabel(due)}, ${formatTime(due)}` : formatTime(due)) : null;

  return (
    <li className={`${card} flex items-center gap-3 transition hover:border-zinc-300 dark:hover:border-zinc-700`}>
      <button
        type="button"
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        onClick={() => toggleTask(task.id)}
        className="flex shrink-0 items-center self-stretch pl-4"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition active:scale-90 ${
            task.completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : overdue
                ? "border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950"
                : "border-zinc-300 hover:border-indigo-500 dark:border-zinc-600"
          }`}
        >
          {task.completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>

      {/* Tapping the task opens it for editing. */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${task.title}`}
        className="min-w-0 flex-1 py-3 pr-4 text-left"
      >
        <p
          className={`break-words leading-snug ${
            task.completed ? "text-zinc-400 line-through dark:text-zinc-500" : "font-medium"
          }`}
        >
          {task.title}
          {task.priority === "high" && !task.completed && (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-rose-500 align-middle" title="Important" />
          )}
        </p>
        {!task.completed && (when || task.repeat !== "none" || task.notes) && (
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-zinc-500">
            {when && (
              <span className={`tabular-nums ${overdue ? "font-medium text-rose-600 dark:text-rose-400" : ""}`}>
                {when}
              </span>
            )}
            {when && remindersLeft && <Bell className="h-3 w-3 shrink-0" aria-label="Reminders set" />}
            {task.repeat !== "none" && (
              <span className="inline-flex items-center gap-0.5">
                <Repeat2 className="h-3.5 w-3.5 shrink-0" />
                {repeatLabel(task.repeat)}
              </span>
            )}
            {task.notes && (
              <span className="truncate">
                {(when || task.repeat !== "none") && "· "}
                {task.notes}
              </span>
            )}
          </p>
        )}
      </button>
    </li>
  );
}
