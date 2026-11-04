"use client";

const SOUND_STORAGE_KEY = "tabletap_kitchen_sound";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioCtx();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Checks if sound alert is enabled in user settings (persisted in localStorage).
 * Defaults to true.
 */
export function getSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
}

/**
 * Unlocks AudioContext on iOS Safari upon explicit user gesture.
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    return ctx.state === "running";
  } catch {
    return false;
  }
}

/**
 * Checks whether AudioContext is running without prompting.
 */
export function isAudioContextRunning(): boolean {
  return sharedAudioContext !== null && sharedAudioContext.state === "running";
}

/**
 * Persists kitchen sound preference in localStorage.
 */
export function setSoundPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore localStorage write errors (e.g. private mode quota)
  }
}

/**
 * Synthesizes a warm two-tone alert chime (D5 -> A5) using the native Web Audio API.
 * 100% offline, zero network latency, no external mp3 assets required.
 */
export async function playOrderAlertChime(): Promise<void> {
  if (!getSoundPreference()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    if (ctx.state !== "running") {
      return;
    }

    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5) - warm bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    // Tone 1 Envelope: quick attack, smooth decay
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.36);

    // Tone 2: 880.00 Hz (A5) - melodic higher chime arriving 100ms later
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.1);

    // Tone 2 Envelope: slightly longer lingering chime
    gain2.gain.setValueAtTime(0.001, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.32, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.66);
  } catch (err) {
    // Silently ignore browser autoplay security blocks
    console.debug("[KitchenSound] AudioContext chime prevented:", err);
  }
}
