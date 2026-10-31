"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { CompositorInstance } from "../lib/canvas-compositor";
type PipWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options: { width: number; height: number }) => Promise<Window>;
  };
};
export function useFloatingStudio(compositor: CompositorInstance | null) {
  const [target, setTarget] = useState<Window | null>(null),
    [supported, setSupported] = useState(false),
    [error, setError] = useState("");
  const current = useRef<Window | null>(null),
    alive = useRef(true),
    opening = useRef(false);
  useEffect(() => {
    alive.current = true;
    setSupported(!!(window as PipWindow).documentPictureInPicture);
    return () => {
      alive.current = false;
      current.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!target || !compositor) return;
    compositor.setClock(target);
    const close = () => {
      compositor.setClock(window);
      current.current = null;
      if (alive.current) setTarget(null);
    };
    target.addEventListener("pagehide", close);
    return () => {
      target.removeEventListener("pagehide", close);
      compositor.setClock(window);
      target.close();
      current.current = null;
      if (alive.current) setTarget(null);
    };
  }, [target, compositor]);
  const open = useCallback(async () => {
    if (!compositor || opening.current) return;
    if (current.current) {
      current.current.focus();
      return;
    }
    opening.current = true;
    setError("");
    try {
      const child = await (window as PipWindow).documentPictureInPicture!.requestWindow({
        width: 640,
        height: 560,
      });
      if (!alive.current || !compositor.canvas.width) {
        child.close();
        return;
      }
      child.document.title = "Ramupod · Demo controls";
      for (const link of document.querySelectorAll('link[rel="stylesheet"]'))
        child.document.head.appendChild(link.cloneNode(true));
      const style = child.document.createElement("style");
      style.textContent =
        "body{margin:0;padding:16px;background:var(--bg,#f6f7f8);color:var(--text,#12383c);font:13px sans-serif;}";
      child.document.head.appendChild(style);
      child.document.documentElement.dataset.theme =
        document.documentElement.dataset.theme;
      current.current = child;
      setTarget(child);
    } catch {
      setError(
        "This browser could not open floating controls. Keep the studio in a separate visible window instead."
      );
    } finally {
      opening.current = false;
    }
  }, [compositor]);
  return { target, supported, error, open };
}
