"use client";

import { addDays, endOfMonth, format, isToday, isTomorrow, startOfMonth } from "date-fns";
import { tasksOnDay } from "@/components/calendar/shared";
import TaskCard from "@/components/TaskCard";
import { card } from "@/components/ui";
import type { Task } from "@/lib/tasks";

function dayTitle(day: Date): string {
  if (isToday(day)) return `Today · ${format(day, "EEEE d MMMM")}`;
  if (isTomorrow(day)) return `Tomorrow · ${format(day, "EEEE d MMMM")}`;
  return format(day, "EEEE d MMMM");
}

/** Every task in the month, grouped by day. */
export default function ListView({ month, tasks }: { month: Date; tasks: Task[] }) {
  const groups: [Date, Task[]][] = [];
  for (let day = startOfMonth(month); day <= endOfMonth(month); day = addDays(day, 1)) {
    const dayTasks = tasksOnDay(tasks, day);
    if (dayTasks.length) {
      groups.push([day, dayTasks]);
    }
  }

  if (groups.length === 0) {
    return (
      <div className={`${card} px-6 py-14 text-center text-sm text-zinc-500`}>
        No tasks in {format(month, "MMMM yyyy")}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([day, dayTasks]) => (
        <section key={day.getTime()}>
          <h3
            className={`mb-2.5 flex items-center gap-2 text-sm font-semibold ${
              isToday(day) ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {dayTitle(day)}
            <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {dayTasks.length}
            </span>
          </h3>
          <ul className="space-y-2.5">
            {dayTasks.map((task) => (
              <TaskCard key={task.id} task={task} showDay={false} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
