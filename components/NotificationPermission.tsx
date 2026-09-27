"use client";

import { useReducer, useSyncExternalStore } from "react";
import { notificationsSupported, requestNotificationPermission } from "@/lib/notifications";

const noSubscription = () => () => {};

export default function NotificationPermission() {
  // Re-render after the permission prompt so the snapshot below is read again.
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const permission = useSyncExternalStore<NotificationPermission | "unsupported" | null>(
    noSubscription,
    () => (notificationsSupported() ? Notification.permission : "unsupported"),
    () => null,
  );

  if (permission === null) {
    return null;
  }

  if (permission === "unsupported") {
    return <span className="text-sm text-zinc-500">Not supported</span>;
  }

  if (permission === "granted") {
    return <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">On</span>;
  }

  if (permission === "denied") {
    return (
      <span className="text-sm text-zinc-500" title="Allow notifications for this site in your browser settings.">
        Blocked in browser
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await requestNotificationPermission();
        rerender();
      }}
      className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
    >
      Turn on
    </button>
  );
}
