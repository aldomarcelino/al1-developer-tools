export type Point = { x: number; y: number };
export type DrawingTool =
  "pointer" | "zoom" | "pen" | "arrow" | "rectangle" | "circle" | "text" | "spotlight";
export type Annotation = {
  tool: "pen" | "arrow" | "rectangle" | "circle" | "text";
  points: Point[];
  color: string;
  stroke: number;
  text?: string;
};
export type Scene = {
  zoom: number;
  focus: Point;
  spotlight: boolean;
  spotlightPosition: Point;
  annotations: Annotation[];
  draft: Annotation | null;
  clicks: { point: Point; at: number; right: boolean }[];
  clickHighlights: boolean;
  clickSize: number;
};
export const newScene = (): Scene => ({
  zoom: 1,
  focus: { x: 0.5, y: 0.5 },
  spotlight: false,
  spotlightPosition: { x: 0.5, y: 0.5 },
  annotations: [],
  draft: null,
  clicks: [],
  clickHighlights: true,
  clickSize: 1,
});
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export function viewRect(zoom: number, point: Point) {
  const scale = clamp(zoom, 1, 3),
    size = 1 / scale;
  return {
    x: clamp(point.x - size / 2, 0, 1 - size),
    y: clamp(point.y - size / 2, 0, 1 - size),
    size,
    scale,
  };
}
export type View = ReturnType<typeof viewRect>;
export function sourcePoint(point: Point, view: View): Point {
  return {
    x: clamp(view.x + point.x * view.size, 0, 1),
    y: clamp(view.y + point.y * view.size, 0, 1),
  };
}
export function renderEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: Scene,
  view: View,
  now: number
) {
  if (scene.spotlight) {
    const p = scene.spotlightPosition;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(
      (p.x - view.x) * width * view.scale,
      (p.y - view.y) * height * view.scale,
      Math.min(width, height) * 0.18,
      0,
      2 * Math.PI,
      true
    );
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.fill("evenodd");
    ctx.restore();
  }
  ctx.save();
  ctx.translate(-view.x * width * view.scale, -view.y * height * view.scale);
  ctx.scale(view.scale, view.scale);
  for (const a of [...scene.annotations, ...(scene.draft ? [scene.draft] : [])]) {
    if (!a.points.length) continue;
    const p = a.points[0],
      q = a.points[a.points.length - 1],
      x = p.x * width,
      y = p.y * height,
      xx = q.x * width,
      yy = q.y * height;
    ctx.save();
    ctx.strokeStyle = a.color;
    ctx.fillStyle = a.color;
    ctx.lineWidth = (a.stroke * height) / 720;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 2;
    ctx.beginPath();
    if (a.tool === "pen") {
      ctx.moveTo(x, y);
      for (const point of a.points) ctx.lineTo(point.x * width, point.y * height);
      ctx.stroke();
    }
    if (a.tool === "arrow") {
      ctx.moveTo(x, y);
      ctx.lineTo(xx, yy);
      const angle = Math.atan2(yy - y, xx - x),
        length = (Math.max(14, a.stroke * 4) * height) / 720;
      ctx.moveTo(
        xx - length * Math.cos(angle - 0.5),
        yy - length * Math.sin(angle - 0.5)
      );
      ctx.lineTo(xx, yy);
      ctx.lineTo(
        xx - length * Math.cos(angle + 0.5),
        yy - length * Math.sin(angle + 0.5)
      );
      ctx.stroke();
    }
    if (a.tool === "rectangle") ctx.strokeRect(x, y, xx - x, yy - y);
    if (a.tool === "circle") {
      ctx.ellipse(
        (x + xx) / 2,
        (y + yy) / 2,
        Math.max(1, Math.abs(xx - x) / 2),
        Math.max(1, Math.abs(yy - y) / 2),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    if (a.tool === "text") {
      ctx.font = `600 ${Math.round((26 * height) / 720)}px sans-serif`;
      ctx.textBaseline = "top";
      const text = (a.text || "").slice(0, 120),
        padding = (8 * height) / 720;
      const length = Math.min(width - x, ctx.measureText(text).width + padding * 2);
      ctx.fillStyle = "rgba(5,20,24,.86)";
      ctx.fillRect(x - padding, y - padding, length, (42 * height) / 720);
      ctx.fillStyle = a.color;
      ctx.fillText(text, x, y, Math.max(1, width - x - padding));
    }
    ctx.restore();
  }
  scene.clicks = scene.clicks.filter((c) => now - c.at < 700).slice(-20);
  for (const click of scene.clicks) {
    const progress = Math.max(0, (now - click.at) / 700),
      p = click.point;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = click.right ? "#fb7185" : "#facc15";
    ctx.fillStyle = "rgba(250,204,21,.16)";
    ctx.lineWidth = (3 * height) / 720;
    ctx.beginPath();
    ctx.arc(
      p.x * width,
      p.y * height,
      ((12 + progress * 24) * scene.clickSize * height) / 720,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
