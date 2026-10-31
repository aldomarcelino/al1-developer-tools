"use client";

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Tooltip } from "./tooltip";
import { LoaderCircle } from "lucide-react";

export type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "secondary" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  iconOnly?: boolean;
  active?: boolean;
  success?: boolean;
  loading?: boolean;
  tooltip?: string | false;
};

/** Shared tool action styling; clipboard, download and editor behavior stay in each feature. */
export function ActionButton({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  active = false,
  success = false,
  loading = false,
  disabled,
  className = "",
  type = "button",
  title,
  tooltip,
  children,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onClick,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
  ...props
}: ActionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focused = useRef(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipId = useId();
  const tooltipText =
    iconOnly && tooltip !== false ? (tooltip ?? title ?? ariaLabel) : undefined;
  const clearTimer = () => {
    clearTimeout(timer.current);
  };
  const show = () => {
    clearTimer();
    setTooltipOpen(true);
  };
  const hide = () => {
    clearTimer();
    setTooltipOpen(false);
  };
  const leave = () => {
    clearTimer();
    if (!focused.current) timer.current = setTimeout(() => setTooltipOpen(false), 120);
  };

  useEffect(() => {
    const pending = timer;
    return () => clearTimeout(pending.current);
  }, []);

  useEffect(() => {
    if (!tooltipOpen) return;
    const dismiss = () => setTooltipOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [tooltipOpen]);

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (event.pointerType !== "touch" && tooltipText) {
            clearTimer();
            timer.current = setTimeout(() => setTooltipOpen(true), 80);
          }
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          leave();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          focused.current = true;
          if (tooltipText) show();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          focused.current = false;
          hide();
        }}
        onClick={(event) => {
          hide();
          onClick?.(event);
        }}
        type={type}
        className={`action-button action-button--${variant} action-button--${size}${iconOnly ? " action-button--icon" : ""}${success ? " is-success" : ""} ${className}`.trim()}
        disabled={disabled || loading}
        aria-label={ariaLabel ?? (iconOnly ? (title ?? tooltipText) : undefined)}
        aria-describedby={
          [describedBy, tooltipOpen && tooltipText ? tooltipId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-pressed={ariaPressed ?? (active ? true : undefined)}
        aria-busy={loading || undefined}
        data-active={active || ariaPressed === true || undefined}
      >
        {loading ? (
          <LoaderCircle className="action-button-spinner" aria-hidden="true" />
        ) : null}
        {children}
      </button>
      {tooltipOpen && tooltipText ? (
        <Tooltip
          id={tooltipId}
          content={tooltipText}
          anchorRef={buttonRef}
          onPointerEnter={show}
          onPointerLeave={leave}
        />
      ) : null}
    </>
  );
}
