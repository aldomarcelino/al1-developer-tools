// Generates a rich high-res sample image client-side for instant zero-friction testing
export function createSampleImage(): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(new File([], "sample.jpg", { type: "image/jpeg" }));
      return;
    }

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 650);
    sky.addColorStop(0, "#0c1b33");
    sky.addColorStop(0.4, "#2b3a67");
    sky.addColorStop(0.7, "#88498f");
    sky.addColorStop(0.9, "#e06d53");
    sky.addColorStop(1, "#f7a072");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 1000);

    // Sun / Moon glow
    const sun = ctx.createRadialGradient(800, 480, 20, 800, 480, 260);
    sun.addColorStop(0, "rgba(255, 248, 220, 1)");
    sun.addColorStop(0.4, "rgba(255, 180, 100, 0.7)");
    sun.addColorStop(1, "rgba(255, 120, 80, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(800, 480, 260, 0, Math.PI * 2);
    ctx.fill();

    // Mountain silhouettes
    const drawMountain = (color: string, points: [number, number][]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.lineTo(1600, 1000);
      ctx.lineTo(0, 1000);
      ctx.closePath();
      ctx.fill();
    };

    drawMountain("#2c1b4d", [
      [0, 620],
      [300, 480],
      [550, 560],
      [820, 420],
      [1100, 530],
      [1350, 460],
      [1600, 580],
    ]);

    drawMountain("#170f2c", [
      [0, 720],
      [220, 610],
      [480, 680],
      [750, 570],
      [1020, 640],
      [1280, 580],
      [1600, 700],
    ]);

    // Water reflection
    const water = ctx.createLinearGradient(0, 780, 0, 1000);
    water.addColorStop(0, "#0f172a");
    water.addColorStop(1, "#020617");
    ctx.fillStyle = water;
    ctx.fillRect(0, 780, 1600, 220);

    // Text watermark / label
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "bold 38px sans-serif";
    ctx.fillText("Ramupod · Sample image", 60, 100);
    ctx.font = "20px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fillText("1600 × 1000 px · Sample scenery", 60, 140);

    canvas.toBlob(
      (blob) => {
        resolve(new File([blob!], "sample-scenery.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.95
    );
  });
}
