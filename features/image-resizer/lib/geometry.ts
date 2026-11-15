export type PercentArea = { x: number; y: number; width: number; height: number };

export type CropShape =
  | "rectangle"
  | "circle"
  | "rounded"
  | "heart"
  | "star"
  | "hexagon"
  | "diamond";

export const shapePresets = [
  { value: "rectangle", label: "Rectangle", description: "Standard square or rectangular frame" },
  { value: "circle", label: "Circle / Oval", description: "Circular avatar or oval frame" },
  { value: "rounded", label: "Rounded Rect", description: "Squircle with rounded corners" },
  { value: "heart", label: "Heart", description: "Romantic heart cutout" },
  { value: "star", label: "Star", description: "5-point star badge" },
  { value: "hexagon", label: "Hexagon", description: "Geometric polygon for tech and gaming avatars" },
  { value: "diamond", label: "Diamond", description: "Rhombus diamond cutout" },
] as const;

export const ratioPresets = [
  { value: "free", label: "Free crop", ratio: undefined },
  { value: "square", label: "Square · 1:1", ratio: 1 },
  { value: "portrait", label: "Social portrait · 4:5", ratio: 4 / 5 },
  { value: "landscape", label: "Landscape · 16:9", ratio: 16 / 9 },
  { value: "photo34", label: "Photo ratio · 3:4", ratio: 3 / 4 },
  { value: "photo46", label: "Photo ratio · 4:6", ratio: 4 / 6 },
  { value: "custom", label: "Custom ratio", ratio: undefined },
] as const;
export function centeredArea(width: number, height: number, ratio?: number): PercentArea {
  if (!ratio) return { x: 0, y: 0, width: 100, height: 100 };
  if (!Number.isFinite(ratio) || ratio <= 0)
    throw new Error("Enter a positive aspect ratio.");
  let w = width,
    h = w / ratio;
  if (h > height) {
    h = height;
    w = h * ratio;
  }
  return {
    x: ((width - w) / width) * 50,
    y: ((height - h) / height) * 50,
    width: (w / width) * 100,
    height: (h / height) * 100,
  };
}
export function pixelArea(area: PercentArea, width: number, height: number) {
  if (
    ![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x + area.width > 100.001 ||
    area.y + area.height > 100.001
  )
    throw new Error("Select a crop area inside the image.");
  const x = (area.x / 100) * width,
    y = (area.y / 100) * height;
  return {
    x,
    y,
    width: Math.min((area.width / 100) * width, width - x),
    height: Math.min((area.height / 100) * height, height - y),
  };
}
export function fitDimensions(width: number, height: number) {
  const scale = Math.min(
    1,
    8192 / width,
    8192 / height,
    Math.sqrt(16_000_000 / (width * height))
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
export function pairedDimension(value: string, ratio: number, axis: "width" | "height") {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < 1) return "";
  return String(Math.max(1, Math.round(axis === "width" ? n / ratio : n * ratio)));
}

/**
 * Returns a normalized SVG path string in a 0 0 100 100 viewBox for the given shape.
 */
export function getShapeSvgPath(shape: CropShape, cornerRadius = 20): string {
  if (shape === "circle") {
    return "M 50 0 A 50 50 0 1 0 50 100 A 50 50 0 1 0 50 0 Z";
  }
  if (shape === "rounded") {
    const r = Math.min(48, Math.max(4, cornerRadius));
    return `M ${r} 0 L ${100 - r} 0 A ${r} ${r} 0 0 1 100 ${r} L 100 ${100 - r} A ${r} ${r} 0 0 1 ${100 - r} 100 L ${r} 100 A ${r} ${r} 0 0 1 0 ${100 - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }
  if (shape === "heart") {
    return "M 50 24 C 45 4, 4 4, 4 35 C 4 60, 28 78, 50 94 C 72 78, 96 60, 96 35 C 96 4, 55 4, 50 24 Z";
  }
  if (shape === "star") {
    return "M 50 2 L 61.3 36.8 L 97.9 36.8 L 68.3 58.3 L 79.6 93.1 L 50 71.6 L 20.4 93.1 L 31.7 58.3 L 2.1 36.8 L 38.7 36.8 Z";
  }
  if (shape === "hexagon") {
    return "M 50 2 L 91.6 26 L 91.6 74 L 50 98 L 8.4 74 L 8.4 26 Z";
  }
  if (shape === "diamond") {
    return "M 50 2 L 98 50 L 50 98 L 2 50 Z";
  }
  return "M 0 0 L 100 0 L 100 100 L 0 100 Z";
}

export interface CanvasPathContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void;
  ellipse?(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void;
  arcTo?(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  roundRect?(x: number, y: number, w: number, h: number, radii?: number | number[]): void;
  closePath(): void;
  clip(): void;
}

/**
 * Clips the 2D canvas context to the specified geometric shape.
 */
export function clipCanvasShape(
  ctx: CanvasPathContext,
  shape: CropShape,
  width: number,
  height: number,
  cornerRadius = 20
) {
  if (shape === "rectangle") return;

  ctx.beginPath();
  if (shape === "circle") {
    if (typeof ctx.ellipse === "function") {
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    } else {
      const r = Math.min(width, height) / 2;
      ctx.moveTo(width / 2 + r, height / 2);
      if (typeof ctx.arcTo === "function") {
        ctx.arcTo(width / 2 + r, height / 2 + r, width / 2, height / 2 + r, r);
        ctx.arcTo(width / 2 - r, height / 2 + r, width / 2 - r, height / 2, r);
        ctx.arcTo(width / 2 - r, height / 2 - r, width / 2, height / 2 - r, r);
        ctx.arcTo(width / 2 + r, height / 2 - r, width / 2 + r, height / 2, r);
      }
    }
  } else if (shape === "rounded") {
    const r = Math.min(
      (cornerRadius / 100) * (Math.min(width, height) / 2),
      Math.min(width, height) / 2
    );
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(0, 0, width, height, r);
    } else if (typeof ctx.arcTo === "function") {
      ctx.moveTo(r, 0);
      ctx.lineTo(width - r, 0);
      ctx.arcTo(width, 0, width, r, r);
      ctx.lineTo(width, height - r);
      ctx.arcTo(width, height, width - r, height, r);
      ctx.lineTo(r, height);
      ctx.arcTo(0, height, 0, height - r, r);
      ctx.lineTo(0, r);
      ctx.arcTo(0, 0, r, 0, r);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
    }
  } else if (shape === "heart") {
    const topCleftY = height * 0.24;
    const bottomTipY = height * 0.94;
    ctx.moveTo(width * 0.5, topCleftY);
    ctx.bezierCurveTo(
      width * 0.45,
      height * 0.04,
      width * 0.04,
      height * 0.04,
      width * 0.04,
      height * 0.35
    );
    ctx.bezierCurveTo(
      width * 0.04,
      height * 0.6,
      width * 0.28,
      height * 0.78,
      width * 0.5,
      bottomTipY
    );
    ctx.bezierCurveTo(
      width * 0.72,
      height * 0.78,
      width * 0.96,
      height * 0.6,
      width * 0.96,
      height * 0.35
    );
    ctx.bezierCurveTo(
      width * 0.96,
      height * 0.04,
      width * 0.55,
      height * 0.04,
      width * 0.5,
      topCleftY
    );
  } else if (shape === "star") {
    const spikes = 5;
    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius * 0.42;
    const cx = width / 2;
    const cy = height / 2;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
  } else if (shape === "hexagon") {
    const radius = Math.min(width, height) / 2;
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 3;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else if (shape === "diamond") {
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width, height / 2);
    ctx.lineTo(width / 2, height);
    ctx.lineTo(0, height / 2);
  }
  ctx.closePath();
  ctx.clip();
}
