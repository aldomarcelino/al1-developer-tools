"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const serverSnapshot = () => "Ctrl";
function browserSnapshot() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
}
/** Keep server rendering deterministic, then use the device's keyboard convention. */
export function useShortcutModifier() {
  return useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot);
}
