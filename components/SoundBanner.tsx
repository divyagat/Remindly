"use client";

import { Volume2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { canPlayAudio, unlockAudio, useVoiceEnabled, voiceSupported } from "@/lib/voice";

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
 * Voice reminders can't play until the page has been tapped once (a browser rule).
 * Says so plainly, with one tap to fix it. Hidden when voice is switched off.
 */
export default function SoundBanner() {
  const soundAllowed = useSyncExternalStore(subscribeToFirstTap, canPlayAudio, () => true);
  const supported = useSyncExternalStore(noSubscription, voiceSupported, () => true);
  const voiceOn = useVoiceEnabled();

  if (!supported || !voiceOn || soundAllowed) {
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
