"use client";

import { Volume2 } from "lucide-react";
import { secondaryButton } from "@/components/ui";
import { announce } from "@/lib/voice";

/** Reads text aloud on demand (also works when the browser blocked automatic sound). */
export default function VoiceButton({ text, label = "Play" }: { text: string; label?: string }) {
  return (
    <button type="button" onClick={() => announce(text)} className={secondaryButton}>
      <Volume2 className="h-4 w-4" />
      {label}
    </button>
  );
}
