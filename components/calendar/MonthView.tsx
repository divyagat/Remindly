"use client";

import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tasksOnDay, taskTone, WEEKDAYS } from "@/components/calendar/shared";
import { card } from "@/components/ui";
import { isOverdue, type Task } from "@/lib/tasks";

// How many tasks fit in a day cell on bigger screens before "+N more".
const MAX_IN_CELL = 3;

interface MonthViewProps {
  month: Date;
  selected: Date;
  tasks: Task[];
  onSelectDay: (day: Date) => void;
  onOpenTask: (task: Task) => void;
}

export default function MonthView({ month, selected, tasks, onSelectDay, onOpenTask }: MonthViewProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    days.push(day);
  }

  return (
    <section className={`${card} overflow-hidden`}>
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-[11px] font-semibold text-zinc-500 uppercase sm:text-xs dark:border-zinc-800 dark:bg-zinc-950">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            <span className="sm:hidden">{day[0]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayTasks = tasksOnDay(tasks, day);
          const open = dayTasks.filter((task) => !task.completed);
          const isSelected = isSameDay(day, selected);
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={day.getTime()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectDay(day)}
              aria-label={`${format(day, "EEEE d MMMM")}, ${open.length} task${open.length === 1 ? "" : "s"}`}
              aria-pressed={isSelected}
              className={`flex min-h-14 cursor-pointer flex-col gap-1 border-zinc-200 p-1 outline-none transition sm:min-h-28 sm:p-1.5 dark:border-zinc-800 ${
                index % 7 !== 6 ? "border-r" : ""
              } ${index < days.length - 7 ? "border-b" : ""} ${
                isSelected
                  ? "bg-indigo-50/70 ring-2 ring-indigo-500 ring-inset dark:bg-indigo-950/50"
                  : inMonth
                    ? "hover:bg-zinc-50 focus-visible:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    : "bg-zinc-50/60 dark:bg-zinc-950/40"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center self-center rounded-full text-xs font-semibold sm:self-start sm:text-sm ${
                  isToday(day)
                    ? "bg-indigo-600 text-white"
                    : inMonth
                      ? "text-zinc-700 dark:text-zinc-200"
                      : "text-zinc-300 dark:text-zinc-600"
                }`}
              >
                {format(day, "d")}
              </span>

              {/* Phones: dots only. */}
              {open.length > 0 && (
                <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {open.slice(0, 4).map((task) => (
                    <span
                      key={task.id}
                      className={`h-1.5 w-1.5 rounded-full ${isOverdue(task) ? "bg-rose-500" : "bg-indigo-500"}`}
                    />
                  ))}
                </span>
              )}

              {/* Bigger screens: time + title. */}
              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {dayTasks.slice(0, MAX_IN_CELL).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTask(task);
                    }}
                    title={`${format(new Date(task.dueAt!), "h:mm a")} ${task.title}`}
                    className={`truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs font-medium transition hover:brightness-95 ${taskTone(task)}`}
                  >
                    <span className="font-semibold tabular-nums">{format(new Date(task.dueAt!), "h:mm")}</span>{" "}
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > MAX_IN_CELL && (
                  <span className="px-1.5 text-xs font-semibold text-zinc-500">
                    +{dayTasks.length - MAX_IN_CELL} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
