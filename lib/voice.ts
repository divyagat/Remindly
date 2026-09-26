"use client";

// Spoken reminders using the browser's built-in speech synthesis plus a short chime
// generated with Web Audio. Neither needs a network connection or sound files.

const VOICE_SETTING_KEY = "remindly.voiceEnabled";

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isVoiceEnabled(): boolean {
  try {
    return window.localStorage.getItem(VOICE_SETTING_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setVoiceEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(VOICE_SETTING_KEY, String(enabled));
  } catch {
    // Ignore: the setting just won't be remembered.
  }
}

/**
 * Browsers only allow sound after the user has interacted with the page
 * (a click, tap or key press). Returns false when audio would be blocked.
 */
export function canPlayAudio(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return activation ? activation.hasBeenActive : true;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioContext && typeof AudioContext !== "undefined") {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Call from a user gesture so later reminders are allowed to make sound. */
export function unlockAudio() {
  void getAudioContext()?.resume();
  if (voiceSupported()) {
    // Loads the voice list and satisfies the "user gesture" requirement for speech.
    window.speechSynthesis.getVoices();
  }
}

export function playChime() {
  const context = getAudioContext();
  if (!context) {
    return;
  }
  void context.resume();
  const start = context.currentTime;
  // Two rising tones.
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = start + index * 0.18;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.4);
  });
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const lang = navigator.language.split("-")[0];
  // Voices installed on the device (localService) keep working offline.
  return (
    voices.find((voice) => voice.localService && voice.lang === navigator.language) ??
    voices.find((voice) => voice.localService && voice.lang.startsWith(lang)) ??
    voices.find((voice) => voice.localService) ??
    voices[0]
  );
}

export function speak(text: string) {
  if (!voiceSupported()) {
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = 0.95;
  synth.speak(utterance);
}

/** Chime, then read the text aloud. */
export function announce(text: string) {
  playChime();
  window.setTimeout(() => speak(text), 600);
}
