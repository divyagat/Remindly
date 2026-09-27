"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";
import { announce, setVoiceEnabled, unlockAudio, useVoiceEnabled, voiceSupported } from "@/lib/voice";

const noSubscription = () => () => {};

/** One-tap on/off for spoken reminders, always in the top bar. */
export default function VoiceToggle() {
  const on = useVoiceEnabled();
  const supported = useSyncExternalStore(noSubscription, voiceSupported, () => true);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Voice reminders"
      title={on ? "Voice reminders are on — tap to turn off" : "Voice reminders are off — tap to turn on"}
      onClick={() => {
        setVoiceEnabled(!on);
        if (!on) {
          unlockAudio();
          announce("Voice reminders are on.");
        }
      }}
      className={`ml-1 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition active:scale-95 ${
        on
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
          : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
      }`}
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      Voice {on ? "on" : "off"}
    </button>
  );
}
