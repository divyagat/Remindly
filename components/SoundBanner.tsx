"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useReducer, useSyncExternalStore } from "react";
import { canPlayAudio, isVoiceEnabled, setVoiceEnabled, unlockAudio, voiceSupported } from "@/lib/voice";

function subscribeToFirstTap(onChange: () => void) {
  window.addEventListener("pointerdown", onChange);
  window.addEventListener("keydown", onChange);
  return () => {
    window.removeEventListener("pointerdown", onChange);
    window.removeEventListener("keydown", onChange);
  };
}

const noSubscription = () => () => {};

/**
 * Voice reminders can't play until the page has been tapped once (a browser rule),
 * or if the user turned voice off. Says so plainly, with one tap to fix it.
 */
export default function SoundBanner() {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const soundAllowed = useSyncExternalStore(subscribeToFirstTap, canPlayAudio, () => true);
  const supported = useSyncExternalStore(noSubscription, voiceSupported, () => true);
  const voiceOn = useSyncExternalStore(noSubscription, isVoiceEnabled, () => true);

  if (!supported) {
    return null;
  }

  if (!voiceOn) {
    return (
      <button
        type="button"
        onClick={() => {
          setVoiceEnabled(true);
          unlockAudio();
          rerender();
        }}
        className="flex w-full items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      >
        <VolumeX className="h-4 w-4 shrink-0" />
        Voice reminders are off. <span className="underline">Turn on</span>
      </button>
    );
  }

  if (soundAllowed) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => unlockAudio()}
      className="flex w-full items-center justify-center gap-2 bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
    >
      <Volume2 className="h-4 w-4 shrink-0" />
      Tap here to turn on voice reminders
    </button>
  );
}
