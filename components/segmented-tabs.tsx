"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TabOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  title?: string;
  badge?: React.ReactNode;
}

export interface SegmentedTabsProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly TabOption<T>[] | TabOption<T>[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}

// SSR-safe useLayoutEffect
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Reusable Segmented Tabs with a smooth sliding indicator pill.
 * Glides smoothly across items when switching tabs.
 */
export function SegmentedTabs<T extends string = string>({
  value,
  onChange,
  options,
  className = "",
  size = "md",
  ariaLabel = "Options",
}: SegmentedTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });
  const [isReady, setIsReady] = useState(false);

  // Position indicator over the currently active tab
  const updateIndicator = () => {
    const activeBtn = tabRefs.current.get(value);
    if (!activeBtn || !containerRef.current) return;

    // offsetLeft and offsetWidth provide exact pixel positioning relative to containerRef
    setIndicatorStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
    setIsReady(true);
  };

  useIsomorphicLayoutEffect(() => {
    updateIndicator();
  }, [value, options]);

  // Keep indicator aligned on window resize or container size change
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateIndicator();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`segmented-tabs-container ${size === "sm" ? "size-sm" : ""} ${className}`.trim()}
    >
      {/* Sliding active indicator pill */}
      <div
        className={`segmented-tabs-indicator ${isReady ? "is-ready" : ""}`}
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
        }}
        aria-hidden="true"
      />

      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(opt.value, el);
              } else {
                tabRefs.current.delete(opt.value);
              }
            }}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`segmented-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onChange(opt.value)}
            title={opt.title}
          >
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span className="tab-badge">{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
