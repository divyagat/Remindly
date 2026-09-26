"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { BellRing, Moon } from "lucide-react";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import { card } from "@/components/ui";
import { eventLabel, formatTime, pendingEvents } from "@/lib/reminder";
import { useSettings } from "@/lib/settings";
import { useTasks } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The home screen: add a task, see the next reminder, and the task list. */
export default function Dashboard({ name }: { name: string }) {
  const tasks = useTasks();
  const settings = useSettings();
  // nowMs is 0 only while hydrating, when tasks are also still empty.
  const nowMs = useNow();
  const now = new Date(nowMs);
  const nextEvent = pendingEvents(tasks, settings).find((event) => event.at >= now);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {nowMs ? greeting(now.getHours()) : "Hello"}, {name} 👋
        </h1>
        <p className="text-zinc-500">{nowMs ? format(now, "EEEE, d MMMM") : " "}</p>
      </header>

      <section className={`${card} p-4 sm:p-5`}>
        <TaskForm />
      </section>

      {nextEvent && (
        <section className="flex items-center gap-3 rounded-2xl bg-indigo-50 p-4 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
          {nextEvent.key === "nightBefore" ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : (
            <BellRing className="h-5 w-5 shrink-0" />
          )}
          <p className="min-w-0 text-sm">
            <span className="font-semibold">Next reminder {formatDistanceToNowStrict(nextEvent.at, { addSuffix: true })}</span>
            <span className="block truncate text-indigo-700 dark:text-indigo-300">
              {nextEvent.task.title} · {formatTime(nextEvent.at)} ({eventLabel(nextEvent.key).toLowerCase()})
            </span>
          </p>
        </section>
      )}

      <TaskList />
    </div>
  );
}
