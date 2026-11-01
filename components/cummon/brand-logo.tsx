import { brandMark } from "@/config/brand";

/**
 * Renders the Ramupod brand mark.
 *
 * Interlocking "Cr" + "p" emblem from the brand identity.
 * Automatically adapts:
 *   - Dark mode: "Cr" turns white (#FFFFFF)
 *   - Light mode: "Cr" turns forest ink (#0F3528) for high contrast on light backgrounds
 *   - Footer: "Cr" is always white (#FFFFFF) on dark footer surface
 *   - "p" is always neon lime (#B7F425)
 *
 * Props:
 *   size        - height in pixels. Standalone width will be size * 1.75; tile is 1:1. Default 36.
 *   monochrome  - render in currentColor.
 *   tile        - render as square tile with rounded forest green background.
 *   className   - forwarded to wrapper span.
 */
export function BrandLogo({
  size = 36,
  className = "",
  monochrome = false,
  tile = false,
  capsule = false,
}: {
  size?: number;
  className?: string;
  monochrome?: boolean;
  /** @deprecated Kept for backwards compatibility */
  filledDetails?: boolean;
  tile?: boolean;
  capsule?: boolean;
}) {
  const m = brandMark;
  const isTile = tile;
  const isCapsule = capsule;
  const width = isTile
    ? size
    : isCapsule
    ? Math.round(size * m.capsuleAspectRatio)
    : Math.round(size * m.aspectRatio);

  const viewBox = isTile
    ? m.viewBox
    : isCapsule
    ? m.capsuleViewBox
    : m.standaloneViewBox;

  return (
    <span
      className={`brand-mark-wrapper ${className}`}
      style={{ display: "inline-flex", width, height: size, flexShrink: 0 }}
    >
      <svg
        width={width}
        height={size}
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="brand-logo-svg"
      >
        {isTile && <rect width="1024" height="1024" rx={m.radius} fill={m.forest} />}
        {isCapsule && (
          <rect x="80" y="260" width="860" height="500" rx={m.capsuleRadius} fill={m.forest} />
        )}
        <path
          className="brand-logo-left"
          fillRule="evenodd"
          fill={monochrome ? "currentColor" : isTile || isCapsule ? m.cream : "var(--brand-ink, #0F3528)"}
          d={m.whitePath}
        />
        <path
          className="brand-logo-right"
          fillRule="evenodd"
          fill={monochrome ? "currentColor" : "var(--brand-lime, #B7F425)"}
          d={m.limePath}
        />
      </svg>
    </span>
  );
}
