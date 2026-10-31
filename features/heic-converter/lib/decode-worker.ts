import { heicTo } from "heic-to/csp";
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    // The bitmap API works in a worker and avoids the decoder's document/canvas path.
    const bitmap = await heicTo({ blob: event.data, type: "bitmap" });
    self.postMessage({ bitmap }, { transfer: [bitmap] });
  } catch {
    self.postMessage({
      error:
        "This HEIC/HEIF image is corrupt or uses an unsupported codec. Try exporting it from Photos.",
    });
  }
};
