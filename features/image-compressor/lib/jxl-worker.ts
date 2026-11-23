import { encodeImageToJxl, type JxlEncodeOptions } from "./jxl.ts";

export type JxlWorkerRequest = {
  id: string;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  options: JxlEncodeOptions;
};

export type JxlWorkerResponse =
  | { id: string; success: true; blob: Blob }
  | { id: string; success: false; error: string };

self.onmessage = async (event: MessageEvent<JxlWorkerRequest>) => {
  const { id, buffer, width, height, options } = event.data;
  try {
    const data = new Uint8ClampedArray(buffer);
    const blob = await encodeImageToJxl({ data, width, height }, options);
    self.postMessage({ id, success: true, blob });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err instanceof Error ? err.message : "JXL encoding failed.",
    });
  }
};
