import type { Play } from "@/features/play-designer/types";
import { normalisePlayCollection, isBrowser } from "@/features/play-designer/utils";

const STORAGE_KEY = "flag-football-plays-v1";

/**
 * Reads the stored plays from localStorage and normalises each entry to guard against schema drift.
 * The function silently returns `null` if it runs in a non-browser context or when parsing fails.
 */
export function loadPlaysFromStorage(): Play[] | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return normalisePlayCollection(data as Play[]);
  } catch (error) {
    console.error("Failed to load plays from storage", error);
    return null;
  }
}

/**
 * Persists the current play collection to localStorage. The operation is no-op outside the browser.
 */
export function savePlaysToStorage(plays: Play[]): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  } catch (error) {
    console.error("Failed to save plays", error);
  }
}
