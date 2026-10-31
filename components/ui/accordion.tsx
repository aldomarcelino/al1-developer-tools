"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./accordion.module.css";

export type AccordionProps = Omit<ComponentPropsWithoutRef<"details">, "title"> & {
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  variant?: "section" | "inline";
};

/** Native disclosure with a section header or a compact in-content appearance. */
export function Accordion({
  title,
  description,
  icon,
  variant = "section",
  className = "",
  children,
  onToggle,
  ...props
}: AccordionProps) {
  return (
    <details
      {...props}
      className={`${styles.root} ${styles[variant]} ${className}`.trim()}
      onToggle={(event) => {
        if (event.target === event.currentTarget) onToggle?.(event);
      }}
    >
      <summary className={styles.trigger}>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className={styles.heading}>
          <span className={styles.title}>{title}</span>
          {description ? <span className={styles.description}>{description}</span> : null}
        </span>
        <span className={styles.indicator} aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
