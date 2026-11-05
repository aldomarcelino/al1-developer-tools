import { GifReader, GifWriter } from "omggif";

export function qualityToMaxColors(quality: number): number {
  if (quality >= 90) return 256;
  if (quality >= 75) return 128;
  if (quality >= 55) return 64;
  if (quality >= 35) return 32;
  return 16;
}

export function isGifBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 6) return false;
  return (
    bytes[0] === 0x47 && // G
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x38 && // 8
    (bytes[4] === 0x37 || bytes[4] === 0x39) && // 7 or 9
    bytes[5] === 0x61 // a
  );
}

export interface QuantizeResult {
  palette: number[];
  indexed: Uint8Array;
  transIndex?: number;
}

export function quantizeFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  maxColors: number,
  ditherRatio: number
): QuantizeResult {
  const pixelCount = width * height;
  let hasTrans = false;

  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] < 128) {
      hasTrans = true;
      break;
    }
  }

  const targetColors = Math.max(2, hasTrans ? maxColors - 1 : maxColors);

  // Subsample large frames for speed during palette extraction
  const colors: [number, number, number][] = [];
  const colorSet = new Set<number>();
  const step = pixelCount > 40000 ? Math.floor(pixelCount / 40000) : 1;

  for (let i = 0; i < rgba.length; i += 4 * step) {
    if (rgba[i + 3] < 128) continue;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const key = (r << 16) | (g << 8) | b;
    if (!colorSet.has(key)) {
      colorSet.add(key);
      colors.push([r, g, b]);
    }
  }

  // Median Cut
  function getRange(box: [number, number, number][]) {
    let rMin = 255,
      rMax = 0,
      gMin = 255,
      gMax = 0,
      bMin = 255,
      bMax = 0;
    for (const [r, g, b] of box) {
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }
    const rR = rMax - rMin,
      gR = gMax - gMin,
      bR = bMax - bMin;
    const maxR = Math.max(rR, gR, bR);
    const channel = maxR === rR ? 0 : maxR === gR ? 1 : 2;
    return { channel, maxR };
  }

  const boxes: [number, number, number][][] = [colors.length ? colors : [[0, 0, 0]]];
  while (boxes.length < targetColors) {
    let bestIdx = -1;
    let bestRange = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length > 1) {
        const { maxR } = getRange(boxes[i]);
        if (maxR > bestRange) {
          bestRange = maxR;
          bestIdx = i;
        }
      }
    }
    if (bestIdx === -1 || bestRange === 0) break;
    const box = boxes.splice(bestIdx, 1)[0];
    const { channel } = getRange(box);
    box.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.length / 2);
    boxes.push(box.slice(0, mid));
    boxes.push(box.slice(mid));
  }

  const palette: number[] = [];
  const transIndex = hasTrans ? 0 : undefined;
  if (hasTrans) {
    palette.push(0x000000);
  }

  for (const box of boxes) {
    if (box.length === 0) continue;
    let rSum = 0,
      gSum = 0,
      bSum = 0;
    for (const [r, g, b] of box) {
      rSum += r;
      gSum += g;
      bSum += b;
    }
    const r = Math.round(rSum / box.length);
    const g = Math.round(gSum / box.length);
    const b = Math.round(bSum / box.length);
    palette.push((r << 16) | (g << 8) | b);
  }

  // Ensure palette length is power of 2 between 2 and 256 (required by GIF spec)
  let pLen = 2;
  while (pLen < palette.length && pLen < 256) pLen <<= 1;
  while (palette.length < pLen) palette.push(0);

  const palR = new Uint8Array(palette.length);
  const palG = new Uint8Array(palette.length);
  const palB = new Uint8Array(palette.length);
  for (let i = 0; i < palette.length; i++) {
    palR[i] = (palette[i] >> 16) & 0xff;
    palG[i] = (palette[i] >> 8) & 0xff;
    palB[i] = palette[i] & 0xff;
  }

  const startIndex = hasTrans ? 1 : 0;
  function findNearest(r: number, g: number, b: number): number {
    let bestDist = Infinity;
    let bestIdx = startIndex;
    for (let i = startIndex; i < palette.length; i++) {
      const dr = r - palR[i];
      const dg = g - palG[i];
      const db = b - palB[i];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
        if (dist === 0) break;
      }
    }
    return bestIdx;
  }

  const indexed = new Uint8Array(pixelCount);
  const dither = ditherRatio > 0.05;
  const curRowErrors = new Float32Array(width * 3);
  const nextRowErrors = new Float32Array(width * 3);

  let pIdx = 0;
  for (let y = 0; y < height; y++) {
    if (dither) nextRowErrors.fill(0);
    for (let x = 0; x < width; x++) {
      const i = pIdx * 4;
      if (rgba[i + 3] < 128) {
        indexed[pIdx++] = transIndex ?? 0;
        continue;
      }
      let r = rgba[i];
      let g = rgba[i + 1];
      let b = rgba[i + 2];

      if (dither) {
        const errIdx = x * 3;
        r = Math.max(0, Math.min(255, r + curRowErrors[errIdx]));
        g = Math.max(0, Math.min(255, g + curRowErrors[errIdx + 1]));
        b = Math.max(0, Math.min(255, b + curRowErrors[errIdx + 2]));
      }

      const colorIdx = findNearest(r, g, b);
      indexed[pIdx++] = colorIdx;

      if (dither) {
        const er = (r - palR[colorIdx]) * ditherRatio;
        const eg = (g - palG[colorIdx]) * ditherRatio;
        const eb = (b - palB[colorIdx]) * ditherRatio;

        if (x + 1 < width) {
          curRowErrors[(x + 1) * 3] += er * (7 / 16);
          curRowErrors[(x + 1) * 3 + 1] += eg * (7 / 16);
          curRowErrors[(x + 1) * 3 + 2] += eb * (7 / 16);
        }
        if (y + 1 < height) {
          if (x > 0) {
            nextRowErrors[(x - 1) * 3] += er * (3 / 16);
            nextRowErrors[(x - 1) * 3 + 1] += eg * (3 / 16);
            nextRowErrors[(x - 1) * 3 + 2] += eb * (3 / 16);
          }
          nextRowErrors[x * 3] += er * (5 / 16);
          nextRowErrors[x * 3 + 1] += eg * (5 / 16);
          nextRowErrors[x * 3 + 2] += eb * (5 / 16);
          if (x + 1 < width) {
            nextRowErrors[(x + 1) * 3] += er * (1 / 16);
            nextRowErrors[(x + 1) * 3 + 1] += eg * (1 / 16);
            nextRowErrors[(x + 1) * 3 + 2] += eb * (1 / 16);
          }
        }
      }
    }
    if (dither) curRowErrors.set(nextRowErrors);
  }

  return { palette, indexed, transIndex };
}

function ensureBufferCapacity(
  writer: GifWriter,
  buf: Uint8Array<ArrayBuffer>,
  additionalBytes: number
): Uint8Array<ArrayBuffer> {
  const currentPos = writer.getOutputBufferPosition();
  const needed = currentPos + additionalBytes;
  if (needed > buf.length) {
    const newBuf = new Uint8Array(Math.max(buf.length * 2, needed + 65536));
    newBuf.set(buf.subarray(0, currentPos));
    writer.setOutputBuffer(newBuf);
    return newBuf;
  }
  return buf;
}

export async function compressGif(
  sourceBuffer: ArrayBuffer,
  targetWidth: number,
  targetHeight: number,
  quality: number
): Promise<Blob> {
  const bytes = new Uint8Array(sourceBuffer);
  if (!isGifBuffer(bytes)) {
    throw new Error("Invalid GIF file header.");
  }

  const reader = new GifReader(bytes);
  const frameCount = reader.numFrames();
  if (frameCount === 0) {
    throw new Error("GIF contains no frames.");
  }

  const sourceWidth = reader.width;
  const sourceHeight = reader.height;
  const loopCount = reader.loopCount() ?? 0;

  const maxColors = qualityToMaxColors(quality);
  // Higher quality keeps more dithering; lower quality reduces dithering to improve LZW compression
  const ditherRatio = Math.max(0, Math.min(1, (quality - 25) / 75));

  let outputBuf = new Uint8Array(
    Math.max(1024 * 1024, targetWidth * targetHeight * frameCount * 2 + 65536)
  );
  const writer = new GifWriter(outputBuf, targetWidth, targetHeight, {
    loop: loopCount,
  });

  const canvasPixels = new Uint8ClampedArray(sourceWidth * sourceHeight * 4);
  let previousSnapshot: Uint8ClampedArray | null = null;

  // Offscreen canvases for resizing when target dimensions differ from source
  const needsResize = targetWidth !== sourceWidth || targetHeight !== sourceHeight;
  let srcCanvas: HTMLCanvasElement | null = null;
  let srcCtx: CanvasRenderingContext2D | null = null;
  let dstCanvas: HTMLCanvasElement | null = null;
  let dstCtx: CanvasRenderingContext2D | null = null;

  if (needsResize && typeof document !== "undefined") {
    srcCanvas = document.createElement("canvas");
    srcCanvas.width = sourceWidth;
    srcCanvas.height = sourceHeight;
    srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });

    dstCanvas = document.createElement("canvas");
    dstCanvas.width = targetWidth;
    dstCanvas.height = targetHeight;
    dstCtx = dstCanvas.getContext("2d", { willReadFrequently: true });
  }

  try {
    for (let i = 0; i < frameCount; i++) {
      const info = reader.frameInfo(i);

      // Handle disposal method of previous frame
      if (i > 0) {
        const prevInfo = reader.frameInfo(i - 1);
        if (prevInfo.disposal === 2) {
          // Restore to background (transparent)
          for (let y = prevInfo.y; y < prevInfo.y + prevInfo.height; y++) {
            if (y >= sourceHeight) break;
            const startX = Math.max(0, prevInfo.x);
            const endX = Math.min(sourceWidth, prevInfo.x + prevInfo.width);
            const rowOffset = (y * sourceWidth + startX) * 4;
            canvasPixels.fill(0, rowOffset, rowOffset + (endX - startX) * 4);
          }
        } else if (prevInfo.disposal === 3 && previousSnapshot) {
          // Restore to previous snapshot
          canvasPixels.set(previousSnapshot);
        }
      }

      // If current frame has disposal 3, save snapshot before blitting
      if (info.disposal === 3) {
        previousSnapshot = new Uint8ClampedArray(canvasPixels);
      } else {
        previousSnapshot = null;
      }

      // Blit frame into full canvas buffer
      reader.decodeAndBlitFrameRGBA(i, canvasPixels);

      let frameRgba: Uint8ClampedArray = canvasPixels;

      // Resize frame if needed
      if (needsResize && srcCtx && dstCtx && srcCanvas && dstCanvas) {
        const imgData = new ImageData(
          new Uint8ClampedArray(canvasPixels),
          sourceWidth,
          sourceHeight
        );
        srcCtx.putImageData(imgData, 0, 0);

        dstCtx.clearRect(0, 0, targetWidth, targetHeight);
        dstCtx.imageSmoothingEnabled = true;
        dstCtx.imageSmoothingQuality = "high";
        dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

        const resizedData = dstCtx.getImageData(0, 0, targetWidth, targetHeight);
        frameRgba = resizedData.data;
      }

      const { palette, indexed, transIndex } = quantizeFrame(
        frameRgba,
        targetWidth,
        targetHeight,
        maxColors,
        ditherRatio
      );

      // Delay in centiseconds (1/100 s), clamp <= 1 to 10 cs as standard in browsers
      const delay = info.delay <= 1 ? 10 : info.delay;

      outputBuf = ensureBufferCapacity(
        writer,
        outputBuf,
        targetWidth * targetHeight * 2 + 2048
      );

      writer.addFrame(0, 0, targetWidth, targetHeight, indexed as unknown as number[], {
        palette,
        delay,
        disposal: 2,
        transparent: transIndex,
      });

      // Yield to browser event loop every 3 frames on multi-frame GIFs to keep UI responsive
      if (frameCount > 1 && i % 3 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    outputBuf = ensureBufferCapacity(writer, outputBuf, 16);
    const endPos = writer.end();
    const finalBytes = outputBuf.subarray(0, endPos);
    return new Blob([finalBytes], { type: "image/gif" });
  } finally {
    if (srcCanvas) {
      srcCanvas.width = 0;
      srcCanvas.height = 0;
    }
    if (dstCanvas) {
      dstCanvas.width = 0;
      dstCanvas.height = 0;
    }
  }
}

export async function encodeStaticImageToGif(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context could not be acquired.");

  const imageData = ctx.getImageData(0, 0, width, height);
  const maxColors = qualityToMaxColors(quality);
  const ditherRatio = Math.max(0, Math.min(1, (quality - 25) / 75));

  const { palette, indexed, transIndex } = quantizeFrame(
    imageData.data,
    width,
    height,
    maxColors,
    ditherRatio
  );

  let outputBuf = new Uint8Array(Math.max(65536, width * height * 2 + 1024));
  const writer = new GifWriter(outputBuf, width, height, { loop: 0 });

  outputBuf = ensureBufferCapacity(writer, outputBuf, width * height * 2 + 1024);
  writer.addFrame(0, 0, width, height, indexed as unknown as number[], {
    palette,
    delay: 0,
    disposal: 2,
    transparent: transIndex,
  });

  outputBuf = ensureBufferCapacity(writer, outputBuf, 16);
  const endPos = writer.end();
  const finalBytes = outputBuf.subarray(0, endPos);
  return new Blob([finalBytes], { type: "image/gif" });
}
