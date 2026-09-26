"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Registers the service worker (which caches pages for offline use) and shows an offline banner. */
export default function OfflineSupport() {
  const online = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    } else {
      // In development the cached build files would hide code changes.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()));
    }
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <WifiOff className="h-4 w-4" />
      You&apos;re offline. Your tasks are saved on this device.
    </div>
  );
}
