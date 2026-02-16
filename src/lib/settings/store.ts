import { Settings } from "@/lib/types";
import { FLICK_THRESHOLD, DEFAULT_COOLDOWN_MS } from "@/lib/constants";

const SETTINGS_KEY = "zombie-flick-settings";

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: FLICK_THRESHOLD,
  flickCooldownMs: DEFAULT_COOLDOWN_MS,
  difficulty: "normal",
  muted: false,
  playerName: "",
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable — silently fail
  }
}
