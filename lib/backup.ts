"use client";

import { format } from "date-fns";
import { getSettings, updateSettings, type Settings } from "@/lib/settings";
import { getTasks, importTasks } from "@/lib/tasks";

// Tasks only live in this browser, so a backup file is the way to keep them safe or
// move them to another device.

interface Backup {
  app: "remindly";
  version: 1;
  exportedAt: string;
  tasks: unknown[];
  settings: Settings;
}

/** Downloads every task and setting as a JSON file. */
export function downloadBackup() {
  const backup: Backup = {
    app: "remindly",
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: getTasks(),
    settings: getSettings(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `remindly-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Restores a backup file; returns how many tasks it contained. Throws with a readable message. */
export async function restoreBackup(file: File): Promise<number> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("This file isn't a Remindly backup.");
  }
  // Also accept a plain list of tasks.
  if (Array.isArray(data)) {
    return importTasks(data);
  }
  const backup = data as Partial<Backup> | null;
  if (!backup || backup.app !== "remindly" || !Array.isArray(backup.tasks)) {
    throw new Error("This file isn't a Remindly backup.");
  }
  const count = importTasks(backup.tasks);
  if (backup.settings && typeof backup.settings === "object") {
    const { repeatMinutes } = backup.settings;
    updateSettings({
      ...backup.settings,
      // Older backups may have overdue repeats switched off; they now always repeat.
      repeatMinutes: repeatMinutes > 0 ? repeatMinutes : getSettings().repeatMinutes,
    });
  }
  return count;
}
