"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  type?: "number";
}

/**
 * Clean NumberInput component.
 * - Hides default browser spinners (increase/decrease arrows)
 * - Disables accidental mouse wheel value scrolling when hovering or focused
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ className = "", onWheel, ...props }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    useEffect(() => {
      const el = inputRef.current;
      if (!el) return;

      // Prevent non-passive mouse wheel delta from altering input value
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
      };

      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        el.removeEventListener("wheel", handleWheel);
      };
    }, []);

    const handleReactWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Blur if focused to ensure no value increment occurs
      e.currentTarget.blur();
      onWheel?.(e);
    };

    return (
      <input
        ref={inputRef}
        type="number"
        className={`number-input-clean ${className}`.trim()}
        onWheel={handleReactWheel}
        {...props}
      />
    );
  }
);
