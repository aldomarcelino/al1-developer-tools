"use client";
import Link from "next/link";
import styles from "./ramupod-logo.module.css";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandLogo } from "./brand-logo";
import { playAssemblySound } from "@/lib/browser/assembly-sound";

const sparkPaths = {
  leaf: ["M20 4C10 2 3 7 4 14c1 6 8 8 12 3 3-4 3-8 4-13Z", "M5 20 15 10"],
  twig: ["m6 21 6-9 4-9", "m12 12-7-3", "m12 12 7-1", "m15 6 5-1"],
  chip: [
    "M7 7h10v10H7Z",
    "M10 10h4v4h-4Z",
    "M9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4",
  ],
  code: ["m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"],
  bolt: ["m13 2-9 12h7l-1 8 10-13h-8Z"],
  braces: [
    "M9 3H7a2 2 0 0 0-2 2v4c0 2-1 3-3 3 2 0 3 1 3 3v4a2 2 0 0 0 2 2h2",
    "M15 3h2a2 2 0 0 1 2 2v4c0 2 1 3 3 3-2 0-3 1-3 3v4a2 2 0 0 1-2 2h-2",
  ],
  star: ["m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"],
} as const;

const pieces = [
  { shape: "leaf", x: -29, y: -12, rotation: -32 },
  { shape: "twig", x: -28, y: 17, rotation: 16 },
  { shape: "chip", x: -9, y: 34, rotation: -18 },
  { shape: "code", x: 19, y: 33, rotation: 12 },
  { shape: "bolt", x: 37, y: 15, rotation: -12 },
  { shape: "braces", x: 41, y: -9, rotation: 14 },
  { shape: "leaf", x: 21, y: -18, rotation: 35 },
  { shape: "star", x: -5, y: -18, rotation: 12 },
] as const;
const message = "Good things, brought together.";

export function RamupodLogo() {
  const [spark, setSpark] = useState<{ id: number; animate: boolean } | null>(null);
  const sequence = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSound = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      stopSound.current?.();
    },
    []
  );

  function ramu() {
    stopSound.current?.();
    stopSound.current = playAssemblySound();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setSpark({
      id: ++sequence.current,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    resetTimer.current = setTimeout(() => {
      setSpark(null);
      resetTimer.current = null;
    }, 2200);
  }

  return (
    <span className={`ramupod-logo ${styles.scope}`}>
      <Link
        href="/"
        className="ramupod-logo-button"
        onClick={ramu}
        aria-label="Ramupod home"
        title="Ramupod home"
      >
        <span
          key={spark?.id ?? "idle"}
          className={
            spark?.animate ? "ramupod-logo-mark is-ramuing" : "ramupod-logo-mark"
          }
        >
          <BrandLogo size={36} filledDetails />
        </span>
      </Link>
      {spark?.animate && (
        <span className="ramupod-spark-field" key={spark.id} aria-hidden="true">
          <span className="ramupod-spark-ring" />
          {pieces.map(({ shape, x, y, rotation }, index) => (
            <span
              key={index}
              className="ramupod-spark-piece"
              data-shape={shape}
              style={
                {
                  "--spark-x": `${x}px`,
                  "--spark-y": `${y}px`,
                  "--spark-rotation": `${rotation}deg`,
                  "--spark-delay": `${index * 30}ms`,
                } as CSSProperties
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                focusable="false"
              >
                {sparkPaths[shape].map((path) => (
                  <path key={path} d={path} />
                ))}
              </svg>
            </span>
          ))}
        </span>
      )}
      {spark && (
        <span className="ramupod-spark-caption" aria-hidden="true">
          <span className="ramupod-spark-dot" />
          {message}
        </span>
      )}
      <span className="sr-only" role="status">
        {spark ? message : ""}
      </span>
    </span>
  );
}
