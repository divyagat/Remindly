"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import ListView from "@/components/calendar/ListView";
import MonthView from "@/components/calendar/MonthView";
import { tasksOnDay, type CalendarMode } from "@/components/calendar/shared";
import TimeGrid from "@/components/calendar/TimeGrid";
import Sheet from "@/components/Sheet";
import TaskCard from "@/components/TaskCard";
import TaskForm from "@/components/TaskForm";
import { card, primaryButton } from "@/components/ui";
import { useTasks, type Task } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

const MODES: { mode: CalendarMode; label: string }[] = [
  { mode: "month", label: "Month" },
  { mode: "week", label: "Week" },
  { mode: "day", label: "Day" },
  { mode: "list", label: "List" },
];

function periodTitle(mode: CalendarMode, date: Date): string {
  if (mode === "day") {
    return isToday(date) ? `Today, ${format(date, "d MMMM")}` : format(date, "EEEE, d MMMM yyyy");
  }
  if (mode === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return isSameMonth(start, end)
      ? `${format(start, "d")} – ${format(end, "d MMM yyyy")}`
      : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  }
  return format(date, "MMMM yyyy");
}

function step(mode: CalendarMode, date: Date, direction: 1 | -1): Date {
  if (mode === "day") return addDays(date, direction);
  if (mode === "week") return addWeeks(date, direction);
  return addMonths(date, direction);
}

type Adding = { date: string; time?: string } | null;

/** Month, week, day and list views of every task, like a regular calendar app. */
export default function CalendarView() {
  const tasks = useTasks();
  const nowMs = useNow();
  const [mode, setMode] = useState<CalendarMode>("month");
  // The day the view is centred on (null = today).
  const [focus, setFocus] = useState<Date | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Adding>(null);

  if (!nowMs) {
    return <div className={`${card} h-[32rem] animate-pulse`} />;
  }

  const today = startOfDay(nowMs);
  const date = focus ?? today;
  const openTask = tasks.find((task) => task.id === openTaskId);
  const selectedTasks = tasksOnDay(tasks, date);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date, { weekStartsOn: 1 }), i));

  function openTaskDialog(task: Task) {
    setOpenTaskId(task.id);
  }

  function addAt(day: Date, hour?: number) {
    setAdding({
      date: format(day, "yyyy-MM-dd"),
      time: hour === undefined ? undefined : `${String(hour).padStart(2, "0")}:00`,
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: period title, navigation and view switcher. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1">
          <h1 className="mr-auto min-w-0 truncate text-xl font-bold tracking-tight sm:text-2xl md:mr-3">
            {periodTitle(mode, date)}
          </h1>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setFocus(step(mode, date, -1))}
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setFocus(null)}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setFocus(step(mode, date, 1))}
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-4 rounded-xl bg-zinc-200/60 p-1 md:flex-none dark:bg-zinc-800">
            {MODES.map(({ mode: value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  mode === value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => addAt(date)} className={`${primaryButton} hidden py-2 md:inline-flex`}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {mode === "month" && (
        <>
          <MonthView
            month={date}
            selected={date}
            tasks={tasks}
            onSelectDay={(day) => setFocus(day)}
            onOpenTask={openTaskDialog}
          />
          {/* Tasks for the chosen day (the month grid only has room for a few). */}
          <section className="space-y-3">
            <h2 className="flex items-baseline gap-2 font-semibold">
              {isToday(date) ? "Today" : format(date, "EEEE d MMMM")}
              <span className="text-sm font-normal text-zinc-500">
                {selectedTasks.length} task{selectedTasks.length === 1 ? "" : "s"}
              </span>
            </h2>
            {selectedTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">Nothing planned for this day.</p>
            ) : (
              <ul className="grid gap-2 lg:grid-cols-2">
                {selectedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} showDay={false} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {mode === "week" && (
        <TimeGrid
          days={weekDays}
          tasks={tasks}
          now={nowMs}
          onOpenTask={openTaskDialog}
          onAddAt={addAt}
          onSelectDay={(day) => {
            setFocus(day);
            setMode("day");
          }}
        />
      )}

      {mode === "day" && (
        <TimeGrid days={[date]} tasks={tasks} now={nowMs} onOpenTask={openTaskDialog} onAddAt={addAt} />
      )}

      {mode === "list" && <ListView month={date} tasks={tasks} />}

      {/* Floating add button on phones (the toolbar button is hidden there). */}
      <button
        type="button"
        aria-label="Add task"
        onClick={() => addAt(date)}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 active:scale-95 md:hidden"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Sheet open={Boolean(openTask)} onClose={() => setOpenTaskId(null)} title="Task">
        {openTask && (
          <ul>
            <TaskCard task={openTask} />
          </ul>
        )}
      </Sheet>

      <Sheet open={adding !== null} onClose={() => setAdding(null)} title="New task">
        {adding && (
          <TaskForm
            key={`${adding.date}-${adding.time ?? ""}`}
            defaultDate={adding.date}
            defaultTime={adding.time}
            autoFocus
            onDone={() => setAdding(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
