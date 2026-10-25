"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandLogo } from "./brand-logo";

const notes = [
  [-36, -35, -22],
  [-20, -58, 14],
  [4, -48, -12],
  [30, -52, 24],
  [49, -25, 18],
  [40, 12, -15],
  [-40, 16, 20],
  [10, -70, -8],
];
export function PianoLogo() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [burst, setBurst] = useState(0);
  const [status, setStatus] = useState("");
  useEffect(
    () => () => {
      const player = audio.current;
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
    },
    []
  );
  function play() {
    if (!audio.current) {
      audio.current = new Audio("/audio/piano-do-c4.mp3");
      audio.current.volume = 0.4;
    }
    const player = audio.current;
    player.currentTime = 0;
    void player
      .play()
      .then(() => setStatus(""))
      .catch(() => setStatus("Piano sound could not play. Try again."));
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setBurst((value) => value + 1);
  }
  return (
    <span className="piano-logo">
      <button
        type="button"
        className="piano-logo-button"
        onClick={play}
        aria-label="Play piano do (C4)"
        title="Al + do"
      >
        <BrandLogo size={36} />
      </button>
      {burst > 0 && (
        <span
          className="piano-note-burst"
          key={burst}
          aria-hidden="true"
          onAnimationEnd={(event) => {
            if ((event.target as HTMLElement).dataset.last === "true") setBurst(0);
          }}
        >
          {notes.map(([x, y, rotation], index) => (
            <span
              key={index}
              data-last={index === notes.length - 1}
              className="piano-note"
              style={
                {
                  "--note-x": `${x}px`,
                  "--note-y": `${y}px`,
                  "--note-r": `${rotation}deg`,
                  "--note-delay": `${index * 25}ms`,
                } as CSSProperties
              }
            >
              {index % 3 === 0 ? "♫" : "♪"}
            </span>
          ))}
        </span>
      )}
      <span className="sr-only" role="status">
        {status}
      </span>
    </span>
  );
}
