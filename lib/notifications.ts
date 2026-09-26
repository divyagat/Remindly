"use client";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) {
    return "denied";
  }
  return Notification.requestPermission();
}

/** Shows a system notification if permission was granted. Returns whether it was shown. */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }
  const options: NotificationOptions = { body, icon: "/icon.svg", tag: title };
  try {
    // Mobile browsers only allow notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
