export const MAX_PDF_IMAGE_PIXELS = 16_000_000;

export function inspectImage(bytes: Uint8Array): {
  width: number;
  height: number;
  format: "png" | "jpeg";
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0,
    format: "png" | "jpeg";
  if (
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  ) {
    format = "png";
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    format = "jpeg";
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error("Invalid JPEG structure.");
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7))
        continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length)
        throw new Error("Truncated JPEG data.");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
        ].includes(marker)
      ) {
        if (length < 8) throw new Error("Invalid JPEG dimensions.");
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  } else throw new Error("Only valid JPG and PNG images are supported.");
  if (
    !width ||
    !height ||
    width > 12000 ||
    height > 12000 ||
    width * height > MAX_PDF_IMAGE_PIXELS
  )
    throw new Error("Images must be at most 16 megapixels and 12,000 px per side.");
  return { width, height, format };
}
