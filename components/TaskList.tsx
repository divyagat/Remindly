"use client";

import { isToday, isTomorrow } from "date-fns";
import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import TaskCard from "@/components/TaskCard";
import { card, input } from "@/components/ui";
import { isOverdue, sortByDue, useTasks, type Task } from "@/lib/tasks";

const GROUP_ORDER = ["Overdue", "Today", "Tomorrow", "Later", "No date"] as const;
type Group = (typeof GROUP_ORDER)[number];

// Only offer search once the list gets long.
const SEARCH_THRESHOLD = 8;

function groupOf(task: Task, now: Date): Group {
  if (!task.dueAt) return "No date";
  const due = new Date(task.dueAt);
  if (isOverdue(task, now)) return "Overdue";
  if (isToday(due)) return "Today";
  if (isTomorrow(due)) return "Tomorrow";
  return "Later";
}

/** All tasks, grouped by when they're due, with finished tasks folded away at the bottom. */
export default function TaskList() {
  const tasks = useTasks();
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);

  const needle = query.trim().toLowerCase();
  const matches = (task: Task) => !needle || `${task.title} ${task.notes}`.toLowerCase().includes(needle);
  const active = tasks.filter((task) => !task.completed);
  const done = tasks
    .filter((task) => task.completed && matches(task))
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const now = new Date();
  const groups = new Map<Group, Task[]>();
  for (const task of active.filter(matches).sort(sortByDue)) {
    const group = groupOf(task, now);
    groups.set(group, [...(groups.get(group) ?? []), task]);
  }

  if (tasks.length === 0) {
    return (
      <div className={`${card} px-6 py-10 text-center`}>
        <p className="text-3xl">📝</p>
        <p className="mt-2 font-medium">No tasks yet</p>
        <p className="text-sm text-zinc-500">Add your first one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tasks.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${input} pl-9`}
          />
        </div>
      )}

      {active.length === 0 && !needle && (
        <div className={`${card} px-6 py-8 text-center`}>
          <p className="text-3xl">🎉</p>
          <p className="mt-2 font-medium">All done!</p>
        </div>
      )}

      {GROUP_ORDER.filter((group) => groups.has(group)).map((group) => (
        <section key={group}>
          <h2
            className={`mb-2 text-sm font-semibold ${
              group === "Overdue" ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
            }`}
          >
            {group} ({groups.get(group)!.length})
          </h2>
          <ul className="space-y-2">
            {groups.get(group)!.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ))}

      {needle && groups.size === 0 && done.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">No tasks match “{query}”.</p>
      )}

      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((open) => !open)}
            className="mb-2 flex items-center gap-1 text-sm font-semibold text-zinc-500"
            aria-expanded={showDone}
          >
            Done ({done.length})
            <ChevronDown className={`h-4 w-4 transition ${showDone ? "rotate-180" : ""}`} />
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
