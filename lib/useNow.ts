"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const interval = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(interval);
}

// Rounded so repeated reads within a tick return the same value.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/** Current time in ms, refreshed every 30 seconds; 0 during server rendering. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
