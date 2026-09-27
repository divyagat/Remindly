"use client";

import { format, formatDistanceToNowStrict, isToday } from "date-fns";
import { AlarmClock, BellRing } from "lucide-react";
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

/**
 * The home screen: a short summary, one box to add tasks, and the task list.
 * Big screens get a side column with today's progress and the next reminder.
 */
export default function Dashboard({ name }: { name: string }) {
  const tasks = useTasks();
  const settings = useSettings();
  // nowMs is 0 only while hydrating, when tasks are also still empty.
  const nowMs = useNow();
  const now = new Date(nowMs);
  const nextEvent = pendingEvents(tasks, settings).find((event) => event.at >= now);

  const dueToday = tasks.filter((task) => task.dueAt && isToday(new Date(task.dueAt)));
  const doneToday = dueToday.filter((task) => task.completed).length;
  const leftToday = dueToday.length - doneToday;
  const overdueCount = tasks.filter((task) => isOverdue(task, now)).length;

  const summary = [
    leftToday ? `${plural(leftToday, "task")} left today` : "Nothing left for today",
    overdueCount ? `${overdueCount} overdue` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const nextWhen = nextEvent && (
    <>
      at {formatTime(nextEvent.at)} ({formatDistanceToNowStrict(nextEvent.at, { addSuffix: true })})
    </>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-6">
        <header>
          <p className="text-sm font-medium text-zinc-500">{nowMs ? format(now, "EEEE, d MMMM") : " "}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
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
          <p className="flex items-center gap-2 text-sm text-zinc-500 lg:hidden">
            <BellRing className="h-4 w-4 shrink-0 text-indigo-500" />
            <span className="min-w-0 truncate">
              Next reminder{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{nextEvent.task.title}</span> {nextWhen}
            </span>
          </p>
        )}

        <TaskList />
      </div>

      {/* Side column on big screens; stays in view while the list scrolls. */}
      <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block">
        <section className={`${card} p-5`}>
          <p className="text-sm font-medium text-zinc-500">Today</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {doneToday}
            <span className="text-base font-medium text-zinc-400"> / {dueToday.length} done</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${dueToday.length ? (doneToday / dueToday.length) * 100 : 0}%` }}
            />
          </div>
          {overdueCount > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">
              <AlarmClock className="h-4 w-4" /> {overdueCount} overdue
            </p>
          )}
        </section>

        <section className={`${card} p-5`}>
          <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
            <BellRing className="h-4 w-4 text-indigo-500" /> Next reminder
          </p>
          {nextEvent ? (
            <>
              <p className="mt-1.5 font-semibold break-words">{nextEvent.task.title}</p>
              <p className="text-sm text-zinc-500">{nextWhen}</p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-500">No reminders coming up.</p>
          )}
        </section>

        <p className="px-1 text-xs leading-relaxed text-zinc-400">
          Tip: type dates straight into a task, like “Call mom tomorrow at 5pm” or “Gym every monday 7am”.
        </p>
      </aside>
    </div>
  );
}
