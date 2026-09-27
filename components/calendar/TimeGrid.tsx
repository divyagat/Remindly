"use client";

import { format, isToday } from "date-fns";
import { useEffect, useRef } from "react";
import { tasksOnDay, taskTone } from "@/components/calendar/shared";
import { card } from "@/components/ui";
import { formatTime } from "@/lib/reminder";
import type { Task } from "@/lib/tasks";

const HOUR_PX = 56;
// Each task is drawn as a 30-minute block.
const BLOCK_MINUTES = 30;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface Placed {
  task: Task;
  top: number;
  column: number;
  columns: number;
}

/** Lays out one day's tasks; tasks whose blocks overlap are placed side by side. */
function layoutDay(tasks: Task[]): Placed[] {
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    const columns = Math.max(...cluster.map((item) => item.column)) + 1;
    cluster.forEach((item) => (item.columns = columns));
    cluster = [];
  };

  // Must go in time order (the day list puts finished tasks last).
  const byTime = [...tasks].sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  for (const task of byTime) {
    const due = new Date(task.dueAt!);
    const minutes = due.getHours() * 60 + due.getMinutes();
    if (cluster.length && minutes >= clusterEnd) {
      closeCluster();
    }
    // First column whose last block has already ended.
    const busy = new Set(
      cluster.filter((item) => item.top / HOUR_PX * 60 + BLOCK_MINUTES > minutes).map((item) => item.column),
    );
    let column = 0;
    while (busy.has(column)) column++;
    const item = { task, top: (minutes / 60) * HOUR_PX, column, columns: 1 };
    cluster.push(item);
    placed.push(item);
    clusterEnd = Math.max(clusterEnd, minutes + BLOCK_MINUTES);
  }
  if (cluster.length) {
    closeCluster();
  }
  return placed;
}

interface TimeGridProps {
  days: Date[];
  tasks: Task[];
  now: number;
  onOpenTask: (task: Task) => void;
  onAddAt: (day: Date, hour: number) => void;
  onSelectDay?: (day: Date) => void;
}

/** Week or day view: an hourly timeline with tasks placed at their time. */
export default function TimeGrid({ days, tasks, now, onOpenTask, onAddAt, onSelectDay }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const single = days.length === 1;

  // Start scrolled to the morning (or the earliest task, if earlier).
  useEffect(() => {
    const earliest = days
      .flatMap((day) => tasksOnDay(tasks, day))
      .map((task) => new Date(task.dueAt!).getHours())
      .reduce((min, hour) => Math.min(min, hour), 7);
    scrollRef.current?.scrollTo({ top: Math.max(earliest - 1, 0) * HOUR_PX });
    // Only when the visible days change, not on every task edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0].getTime(), days.length]);

  const nowDate = new Date(now);
  const nowTop = ((nowDate.getHours() * 60 + nowDate.getMinutes()) / 60) * HOUR_PX;

  return (
    <section className={`${card} overflow-hidden`}>
      {/* Seven columns need room: on narrow phones the week scrolls sideways inside the card. */}
      <div className="overflow-x-auto">
        <div className={single ? "" : "min-w-[640px]"}>
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <div className="w-14 shrink-0" />
            {days.map((day) => (
              <button
                key={day.getTime()}
                type="button"
                onClick={() => onSelectDay?.(day)}
                disabled={!onSelectDay}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 enabled:hover:bg-zinc-50 dark:enabled:hover:bg-zinc-800/50"
              >
                <span className="text-[11px] font-semibold text-zinc-500 uppercase">{format(day, "EEE")}</span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    isToday(day) ? "bg-indigo-600 text-white" : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="max-h-[65dvh] overflow-y-auto">
            <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
              <div className="w-14 shrink-0">
                {HOURS.map((hour) => (
                  <div key={hour} className="relative" style={{ height: HOUR_PX }}>
                    {hour > 0 && (
                      <span className="absolute -top-2 right-2 text-[10px] font-medium text-zinc-400 tabular-nums">
                        {format(new Date(2000, 0, 1, hour), "h a")}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {days.map((day) => (
                <div
                  key={day.getTime()}
                  className="relative flex-1 border-l border-zinc-200 dark:border-zinc-800"
                >
                  {HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      aria-label={`Add task on ${format(day, "EEEE d MMMM")} at ${format(new Date(2000, 0, 1, hour), "h a")}`}
                      onClick={() => onAddAt(day, hour)}
                      className="block w-full border-b border-zinc-100 transition hover:bg-indigo-50/60 dark:border-zinc-800/70 dark:hover:bg-indigo-950/40"
                      style={{ height: HOUR_PX }}
                    />
                  ))}

                  {isToday(day) && (
                    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                      <div className="relative h-0.5 bg-rose-500">
                        <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                      </div>
                    </div>
                  )}

                  {layoutDay(tasksOnDay(tasks, day)).map(({ task, top, column, columns }) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpenTask(task)}
                      title={`${formatTime(new Date(task.dueAt!))} ${task.title}`}
                      className={`absolute z-[5] overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-xs leading-tight shadow-sm transition hover:z-20 hover:shadow-md ${taskTone(task)}`}
                      style={{
                        top: top + 1,
                        height: (BLOCK_MINUTES / 60) * HOUR_PX - 2,
                        left: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 4px)`,
                      }}
                    >
                      <span className="block truncate pt-0.5 font-semibold">{task.title}</span>
                      <span className="block truncate text-[10px] opacity-75 tabular-nums">
                        {formatTime(new Date(task.dueAt!))}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
