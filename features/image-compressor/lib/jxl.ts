import { defaultOptions } from "@jsquash/jxl/meta.js";
import type { JxlWorkerResponse, JxlWorkerRequest } from "./jxl-worker.ts";

let wasmModulePromise: Promise<WebAssembly.Module> | null = null;
let initialized = false;

async function getWasmModule(): Promise<WebAssembly.Module> {
  if (wasmModulePromise) return wasmModulePromise;
  wasmModulePromise = (async () => {
    if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const wasmPath = path.resolve(process.cwd(), "public/wasm/jxl_enc.wasm");
      const buffer = await fs.readFile(wasmPath);
      return WebAssembly.compile(buffer);
    }
    const response = await fetch("/wasm/jxl_enc.wasm");
    if (!response.ok) {
      throw new Error("Could not load JPEG XL WebAssembly encoder.");
    }
    return WebAssembly.compile(await response.arrayBuffer());
  })();
  return wasmModulePromise;
}

export type JxlEncodeOptions = {
  quality?: number;
  lossless?: boolean;
  effort?: number;
};

export async function encodeImageToJxl(
  imageData: { data: Uint8ClampedArray; width: number; height: number },
  options: JxlEncodeOptions = {}
): Promise<Blob> {
  const { init } = await import("@jsquash/jxl/encode.js");
  const encode = (await import("@jsquash/jxl/encode.js")).default;
  if (!initialized) {
    const mod = await getWasmModule();
    await init(mod);
    initialized = true;
  }
  const lossless = Boolean(options.lossless);
  const quality = lossless
    ? 100
    : Math.max(1, Math.min(100, Math.round(options.quality ?? 80)));
  const effort = options.effort ?? 7;

  const jxlBuffer = await encode(imageData as ImageData, {
    ...defaultOptions,
    quality,
    lossless,
    effort,
  });
  return new Blob([jxlBuffer], { type: "image/jxl" });
}

let sharedWorker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<
  string,
  { resolve: (blob: Blob) => void; reject: (err: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(new URL("./jxl-worker.ts", import.meta.url), {
        type: "module",
      });
      sharedWorker.onmessage = (event: MessageEvent<JxlWorkerResponse>) => {
        const handler = pendingRequests.get(event.data.id);
        if (!handler) return;
        pendingRequests.delete(event.data.id);
        if (event.data.success) {
          handler.resolve(event.data.blob);
        } else {
          handler.reject(new Error(event.data.error));
        }
      };
      sharedWorker.onerror = (err) => {
        console.error("JXL worker error:", err);
      };
    } catch {
      sharedWorker = null;
    }
  }
  return sharedWorker;
}

export async function encodeImageToJxlAsync(
  imageData: { data: Uint8ClampedArray; width: number; height: number },
  options: JxlEncodeOptions = {}
): Promise<Blob> {
  const worker = getWorker();
  if (worker) {
    const id = `jxl-${nextRequestId++}`;
    const copyBuffer = imageData.data.buffer.slice(
      imageData.data.byteOffset,
      imageData.data.byteOffset + imageData.data.byteLength
    ) as ArrayBuffer;
    return new Promise<Blob>((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      const request: JxlWorkerRequest = {
        id,
        buffer: copyBuffer,
        width: imageData.width,
        height: imageData.height,
        options,
      };
      worker.postMessage(request, [copyBuffer]);
    });
  }
  return encodeImageToJxl(imageData, options);
}
