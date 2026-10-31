/** A labeled, synthetic source to explore the real compositor/encoder without capture permissions. */
export function createDemoSource() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  const draw = () => {
    ctx.fillStyle = "#f1f5f4";
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = "#12383c";
    ctx.fillRect(0, 0, 230, 720);
    ctx.fillStyle = "#dfffba";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("acme / studio", 28, 58);
    ctx.fillStyle = "#d0e2dc";
    ctx.font = "20px sans-serif";
    ["Dashboard", "Customers", "Revenue", "Settings"].forEach((v, i) =>
      ctx.fillText(v, 28, 155 + i * 64)
    );
    ctx.fillStyle = "#16383c";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("Your product, in focus.", 280, 75);
    ctx.fillStyle = "#52665e";
    ctx.font = "18px sans-serif";
    ctx.fillText("DEMO SCENE · Synthetic data · Not a screen capture", 280, 115);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(280 + i * 315, 155, 285, 120);
      ctx.fillStyle = "#52665e";
      ctx.font = "18px sans-serif";
      ctx.fillText(
        ["Active accounts", "Monthly revenue", "Conversion"][i],
        300 + i * 315,
        190
      );
      ctx.fillStyle = "#16383c";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(["2,480", "$42,600", "8.4%"][i], 300 + i * 315, 243);
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(280, 310, 915, 325);
    ctx.fillStyle = "#16383c";
    ctx.font = "22px sans-serif";
    ctx.fillText("Growth this quarter", 310, 352);
    const t = performance.now() / 1000;
    for (let i = 0; i < 10; i++) {
      const h = 80 + i * 13 + Math.sin(t + i) * 15;
      ctx.fillStyle = i === 7 ? "#b8e393" : "#4d8c7f";
      ctx.fillRect(320 + i * 83, 590 - h, 48, h);
    }
    ctx.fillStyle = "#52665e";
    ctx.font = "18px sans-serif";
    ctx.fillText("Click to mark · Z to focus · D to draw · S for spotlight", 280, 684);
  };
  draw();
  const timer = setInterval(draw, 1000 / 15),
    stream = canvas.captureStream(15);
  return {
    stream,
    cleanup: () => {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
