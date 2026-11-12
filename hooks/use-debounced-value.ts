"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue(value: string, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  // Clearing a search should restore its results immediately.
  return value.trim() ? debouncedValue : value;
}
