import type { CSSProperties } from "react";
import { brandMark } from "@/config/brand";

export function BrandLogo({
  size = 36,
  className = "",
  monochrome = false,
  filledDetails = false,
}: {
  size?: number;
  className?: string;
  monochrome?: boolean;
  filledDetails?: boolean;
}) {
  const filled = filledDetails && !monochrome;
  return (
    <span
      className={`brand-mark-wrapper ${className}`}
      style={{ display: "inline-flex", width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={brandMark.standaloneViewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="brand-logo-svg"
        style={
          {
            "--brand-ink": brandMark.forest,
            "--brand-ink-dark": brandMark.cream,
          } as CSSProperties
        }
      >
        {filled && <path d={brandMark.silhouettePath} fill={brandMark.forest} />}
        <path
          d={brandMark.bodyPath}
          fill={filled ? brandMark.cream : "currentColor"}
          fillRule="evenodd"
        />
        <path
          d={brandMark.accentPath}
          fill={monochrome ? "currentColor" : brandMark.lime}
        />
      </svg>
    </span>
  );
}
