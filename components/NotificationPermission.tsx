"use client";

import { useReducer, useSyncExternalStore } from "react";
import { primaryButton } from "@/components/ui";
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
    return <p className="text-sm text-zinc-500">This browser doesn&apos;t support notifications.</p>;
  }

  if (permission === "granted") {
    return <p className="text-sm text-green-700 dark:text-green-400">Notifications are on.</p>;
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-zinc-500">
        Notifications are blocked. Allow them for this site in your browser settings.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await requestNotificationPermission();
        rerender();
      }}
      className={primaryButton}
    >
      Turn on notifications
    </button>
  );
}
