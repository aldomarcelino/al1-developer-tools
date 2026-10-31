"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Replace the previous notice and cancel its expiry when a newer one arrives. */
export function useNotice(initial = "", duration = 3500) {
  const [notice, setNotice] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showNotice = useCallback(
    (message: string) => {
      clearTimeout(timer.current);
      setNotice(message);
      timer.current = setTimeout(() => setNotice(""), duration);
    },
    [duration]
  );

  return [notice, showNotice] as const;
}
