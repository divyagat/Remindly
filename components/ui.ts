// Shared Tailwind class names so every screen looks consistent.

export const card =
  "rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-900";

export const input =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-950";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function chip(selected: boolean): string {
  return `relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
    selected
      ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

/** Page wrapper: full width on phones, centred with comfortable margins on bigger screens. */
export const page = "mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8";

/** Narrower wrapper for single-column screens (home, settings) so lines stay easy to read. */
export const narrowPage = "mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10";
