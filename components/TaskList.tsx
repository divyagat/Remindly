"use client";

import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ChevronDown, Search, Volume2 } from "lucide-react";
import { useState } from "react";
import TaskCard from "@/components/TaskCard";
import { input } from "@/components/ui";
import { useSettings } from "@/lib/settings";
import { isOverdue, sortByDue, useTasks, type Task } from "@/lib/tasks";

const OVERDUE = "overdue";
const NO_DATE = "no-date";

// Only offer search once the list gets long.
const SEARCH_THRESHOLD = 8;

/** Overdue tasks share one group; the rest are grouped by the day they're due ("yyyy-MM-dd"). */
function groupKey(task: Task, now: Date): string {
  if (!task.dueAt) return NO_DATE;
  if (isOverdue(task, now)) return OVERDUE;
  return format(new Date(task.dueAt), "yyyy-MM-dd");
}

function groupHeading(key: string, now: Date): { title: string; subtitle?: string } {
  if (key === OVERDUE) return { title: "Overdue" };
  if (key === NO_DATE) return { title: "Anytime" };
  const day = parseISO(key);
  if (isToday(day)) return { title: "Today" };
  if (isTomorrow(day)) return { title: "Tomorrow" };
  return {
    title: format(day, "EEEE"),
    subtitle: format(day, day.getFullYear() === now.getFullYear() ? "d MMM" : "d MMM yyyy"),
  };
}

/** All tasks sorted by date and grouped day by day, with finished tasks folded away at the bottom. */
export default function TaskList() {
  const tasks = useTasks();
  const settings = useSettings();
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);

  const needle = query.trim().toLowerCase();
  const matches = (task: Task) => !needle || `${task.title} ${task.notes}`.toLowerCase().includes(needle);
  const active = tasks.filter((task) => !task.completed);
  const done = tasks
    .filter((task) => task.completed && matches(task))
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const now = new Date();
  // Sorted by due time, so groups come out in order: overdue, then day by day, then no date.
  const groups = new Map<string, Task[]>();
  for (const task of active.filter(matches).sort(sortByDue)) {
    const group = groupKey(task, now);
    groups.set(group, [...(groups.get(group) ?? []), task]);
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="text-4xl">📝</span>
        <p className="mt-3 font-semibold">No tasks yet</p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">Type what you need to remember in the box above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tasks.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${input} border-transparent bg-zinc-200/60 pl-10 dark:border-transparent dark:bg-zinc-900`}
          />
        </div>
      )}

      {active.length === 0 && !needle && (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="text-4xl">🎉</span>
          <p className="mt-3 font-semibold">All done!</p>
          <p className="text-sm text-zinc-500">Nothing left to do. Enjoy your day.</p>
        </div>
      )}

      {[...groups].map(([key, groupTasks]) => {
        const { title, subtitle } = groupHeading(key, now);
        const overdue = key === OVERDUE;
        return (
          <section key={key}>
            {/* Stays pinned under the top bar while scrolling through that day's tasks. */}
            <h3 className="sticky top-[57px] z-10 -mx-1 mb-1.5 flex items-baseline gap-2 bg-[var(--background)]/90 px-1 py-2 backdrop-blur">
              <span
                className={`font-semibold ${
                  overdue
                    ? "text-rose-600 dark:text-rose-400"
                    : title === "Today"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : ""
                }`}
              >
                {title}
              </span>
              {subtitle && <span className="text-sm text-zinc-500">{subtitle}</span>}
              {overdue && (
                <span className="inline-flex items-center gap-1 self-center text-xs text-zinc-500">
                  <Volume2 className="h-3.5 w-3.5" />
                  Reminding you every {settings.repeatMinutes === 60 ? "hour" : `${settings.repeatMinutes} min`} until done
                </span>
              )}
              <span className="ml-auto text-sm text-zinc-400 tabular-nums">{groupTasks.length}</span>
            </h3>
            <ul className="space-y-2">
              {groupTasks.map((task) => (
                <TaskCard key={task.id} task={task} showDay={false} />
              ))}
            </ul>
          </section>
        );
      })}

      {needle && groups.size === 0 && done.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">No tasks match “{query}”.</p>
      )}

      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((open) => !open)}
            className="mb-2 flex items-center gap-1 rounded-lg py-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            aria-expanded={showDone}
          >
            <ChevronDown className={`h-4 w-4 transition ${showDone ? "" : "-rotate-90"}`} />
            Done ({done.length})
          </button>
          {showDone && (
            <ul className="space-y-2">
              {done.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
