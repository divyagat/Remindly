"use client";

import { format, isToday, isTomorrow } from "date-fns";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import TaskForm from "@/components/TaskForm";
import { card } from "@/components/ui";
import { formatTime } from "@/lib/reminder";
import { deleteTask, isOverdue, toggleTask, type Task } from "@/lib/tasks";

function dueLabel(due: Date): string {
  if (isToday(due)) return `Today, ${formatTime(due)}`;
  if (isTomorrow(due)) return `Tomorrow, ${formatTime(due)}`;
  return format(due, "EEE d MMM, h:mm a");
}

export default function TaskCard({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false);
  const overdue = isOverdue(task);
  const due = task.dueAt ? new Date(task.dueAt) : null;

  if (editing) {
    return (
      <li className={`${card} animate-slide-up p-4`}>
        <TaskForm task={task} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`${card} flex items-center gap-3 p-3.5`}>
      <button
        type="button"
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        onClick={() => toggleTask(task.id)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
          task.completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-zinc-300 hover:border-indigo-500 dark:border-zinc-600"
        }`}
      >
        {task.completed && <Check className="h-4 w-4" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`break-words font-medium ${task.completed ? "text-zinc-400 line-through" : ""}`}>
          {task.priority === "high" && !task.completed && (
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500 align-middle" title="Important" />
          )}
          {task.title}
        </p>
        {due && !task.completed && (
          <p className={`text-sm ${overdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
            {dueLabel(due)}
          </p>
        )}
        {task.notes && !task.completed && (
          <p className="truncate text-sm text-zinc-500">{task.notes}</p>
        )}
      </div>

      {!task.completed && (
        <button
          type="button"
          aria-label="Edit task"
          onClick={() => setEditing(true)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        aria-label="Delete task"
        onClick={() => deleteTask(task.id)}
        className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
