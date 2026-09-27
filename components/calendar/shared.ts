import { isSameDay } from "date-fns";
import { isOverdue, type Task } from "@/lib/tasks";

export type CalendarMode = "month" | "week" | "day" | "list";

/** Colour classes for a task shown inside the calendar. */
export function taskTone(task: Task): string {
  if (task.completed) {
    return "border-zinc-300 bg-zinc-100 text-zinc-400 line-through dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500";
  }
  if (isOverdue(task)) {
    return "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
  }
  if (task.priority === "high") {
    return "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
  }
  return "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100";
}

/** Tasks due on a given day, earliest first (finished ones last). */
export function tasksOnDay(tasks: Task[], day: Date): Task[] {
  return tasks
    .filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), day))
    .sort((a, b) =>
      a.completed === b.completed ? a.dueAt!.localeCompare(b.dueAt!) : a.completed ? 1 : -1,
    );
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
