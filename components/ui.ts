// Shared Tailwind class names so every screen looks consistent.

export const card =
  "rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const input =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-950";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function chip(selected: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    selected
      ? "border-indigo-600 bg-indigo-600 text-white"
      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
  }`;
}

export const PRIORITY_STYLES = {
  high: { bar: "bg-rose-500", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300", label: "High" },
  medium: {
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    label: "Medium",
  },
  low: { bar: "bg-sky-400", badge: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300", label: "Low" },
} as const;
