"use client";

import { format, formatDistanceToNowStrict, isToday } from "date-fns";
import { BellRing } from "lucide-react";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import { card } from "@/components/ui";
import { formatTime, pendingEvents } from "@/lib/reminder";
import { useSettings } from "@/lib/settings";
import { isOverdue, useTasks } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** The home screen: a short summary, one box to add tasks, and the task list. */
export default function Dashboard({ name }: { name: string }) {
  const tasks = useTasks();
  const settings = useSettings();
  // nowMs is 0 only while hydrating, when tasks are also still empty.
  const nowMs = useNow();
  const now = new Date(nowMs);
  const nextEvent = pendingEvents(tasks, settings).find((event) => event.at >= now);

  const leftToday = tasks.filter((task) => !task.completed && task.dueAt && isToday(new Date(task.dueAt))).length;
  const overdueCount = tasks.filter((task) => isOverdue(task, now)).length;

  const summary = [
    leftToday ? `${plural(leftToday, "task")} left today` : "Nothing left for today",
    overdueCount ? `${overdueCount} overdue` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-zinc-500">{nowMs ? format(now, "EEEE, d MMMM") : " "}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {nowMs ? greeting(now.getHours()) : "Hello"}, {name.split(" ")[0]}
        </h1>
        {nowMs > 0 && (
          <p className={`mt-1 ${overdueCount ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>{summary}</p>
        )}
      </header>

      <section className={`${card} p-3 shadow-sm sm:p-4`}>
        <TaskForm compact />
      </section>

      {nextEvent && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <BellRing className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="truncate">
            Next reminder <span className="font-medium text-zinc-800 dark:text-zinc-200">{nextEvent.task.title}</span>{" "}
            at {formatTime(nextEvent.at)} ({formatDistanceToNowStrict(nextEvent.at, { addSuffix: true })})
          </span>
        </p>
      )}

      <TaskList />
    </div>
  );
}
