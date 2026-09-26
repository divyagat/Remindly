"use client";

import { addDays, format, isSameDay, isToday, isTomorrow, startOfDay } from "date-fns";
import TaskCard from "@/components/TaskCard";
import { card } from "@/components/ui";
import { sortByDue, useTasks, type Task } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

function dayLabel(day: Date): string {
  if (isToday(day)) return "Today";
  if (isTomorrow(day)) return "Tomorrow";
  return format(day, "EEEE d MMMM yyyy");
}

/** Next 7 days at a glance, then an agenda of open tasks grouped by day. */
export default function CalendarView() {
  const tasks = useTasks();
  const nowMs = useNow();
  const scheduled = tasks.filter((task) => !task.completed && task.dueAt).sort(sortByDue);

  const groups = new Map<number, Task[]>();
  for (const task of scheduled) {
    const key = startOfDay(new Date(task.dueAt!)).getTime();
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  const week = nowMs ? Array.from({ length: 7 }, (_, i) => addDays(startOfDay(nowMs), i)) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {week.map((day) => {
          const count = scheduled.filter((task) => isSameDay(new Date(task.dueAt!), day)).length;
          return (
            <a
              key={day.getTime()}
              href={count ? `#day-${startOfDay(day).getTime()}` : undefined}
              className={`${card} flex flex-col items-center gap-1 py-3 ${
                isToday(day) ? "!border-indigo-500 ring-2 ring-indigo-500/20" : ""
              }`}
            >
              <span className="text-[10px] font-semibold text-zinc-500 uppercase sm:text-xs">{format(day, "EEE")}</span>
              <span className="text-lg font-bold">{format(day, "d")}</span>
              <span
                className={`min-w-5 rounded-full px-1.5 text-center text-[10px] font-bold ${
                  count ? "bg-indigo-600 text-white" : "text-zinc-300 dark:text-zinc-700"
                }`}
              >
                {count || "·"}
              </span>
            </a>
          );
        })}
      </div>

      {groups.size === 0 ? (
        <div className={`${card} px-6 py-12 text-center text-sm text-zinc-500`}>No tasks with a date yet.</div>
      ) : (
        [...groups].map(([day, dayTasks]) => (
          <section key={day} id={`day-${day}`} className="scroll-mt-4">
            <h2 className="mb-2 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              {dayLabel(new Date(day))} · {dayTasks.length}
            </h2>
            <ul className="space-y-2.5">
              {dayTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
