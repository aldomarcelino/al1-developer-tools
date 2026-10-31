"use client";

import { CircleCheck, CircleAlert, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SnackbarMessage } from "@/hooks/use-snackbar";
import styles from "./snackbar.module.css";

type SnackbarProps = {
  snackbar: SnackbarMessage | null;
  onDismiss: () => void;
};

/** Render outside workspace containers so feedback remains visible while scrolling. */
export function Snackbar({ snackbar, onDismiss }: SnackbarProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Keep the server output and the first client render identical. Portals can
  // only be attached after hydration has committed.
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!portalTarget) return null;

  const Icon =
    snackbar?.variant === "error"
      ? CircleAlert
      : snackbar?.variant === "info"
        ? Info
        : CircleCheck;

  return createPortal(
    <div className={styles.region}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {snackbar ? (
          <div className={styles.snackbar} data-variant={snackbar.variant}>
            <Icon className={styles.icon} size={20} aria-hidden="true" />
            <span className={styles.message}>{snackbar.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              onClick={onDismiss}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    portalTarget
  );
}
