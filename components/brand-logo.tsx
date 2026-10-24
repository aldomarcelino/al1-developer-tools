import React from "react";

export function BrandLogo({
  size = 36,
  className = "",
  withDot = true,
}: {
  size?: number;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span
      className={`brand-mark-wrapper ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="brand-logo-svg"
      >
        <defs>
          <linearGradient
            id="al1-bg"
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#12434a" />
            <stop offset="100%" stopColor="#061c1f" />
          </linearGradient>
          <linearGradient
            id="al1-stroke"
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#a4d881" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#256068" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a4d881" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient
            id="al1-one"
            x1="25"
            y1="12"
            x2="30"
            y2="28"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#cbf58c" />
            <stop offset="100%" stopColor="#8dd25e" />
          </linearGradient>
        </defs>

        {/* Squircle container badge */}
        <rect
          x="1.5"
          y="1.5"
          width="37"
          height="37"
          rx="10"
          fill="url(#al1-bg)"
          stroke="url(#al1-stroke)"
          strokeWidth="1.5"
        />

        {/* Subtle developer terminal accent grid line */}
        <line
          x1="7"
          y1="30"
          x2="33"
          y2="30"
          stroke="#a4d881"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* "a" - modern geometric glyph */}
        <path
          d="M 16.2 17.5 V 26.5"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M 16.2 21.5 C 16.2 17.8 8.8 17.8 8.8 22.2 C 8.8 26.6 16.2 26.6 16.2 23.2"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* "l" - sleek vertical stem */}
        <path
          d="M 20.8 13 V 26.5"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* "1" - developer accent numeral */}
        <path
          d="M 25.4 15.8 L 28.6 13 V 26.5"
          stroke="url(#al1-one)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active status indicator dot */}
        {withDot && (
          <g className="brand-status-dot">
            <circle cx="32.5" cy="7.5" r="3" fill="#a4d881" />
            <circle
              cx="32.5"
              cy="7.5"
              r="4.5"
              stroke="#061c1f"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        )}
      </svg>
    </span>
  );
}
