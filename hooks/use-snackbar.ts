"use client";

import { useCallback, useEffect, useState } from "react";

export type SnackbarMessage = {
  message: string;
  variant: "success" | "error" | "info";
};

/** Each new message restarts the timeout, including repeated copy actions. */
export function useSnackbar(duration = 4000) {
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  const dismissSnackbar = useCallback(() => setSnackbar(null), []);
  const showSnackbar = useCallback(
    (message: string, variant: SnackbarMessage["variant"] = "success") => {
      setSnackbar({ message, variant });
    },
    []
  );

  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(dismissSnackbar, duration);
    return () => clearTimeout(timer);
  }, [snackbar, duration, dismissSnackbar]);

  return { snackbar, showSnackbar, dismissSnackbar };
}
