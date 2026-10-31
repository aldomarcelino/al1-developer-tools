export const HEIC_MAX_FILES = 20;
export const HEIC_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const HEIC_MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const HEIC_MAX_RESULT_BYTES = 150 * 1024 * 1024;
export function validateHeicFile(file: { name: string; size: number }) {
  if (!/\.hei[cf]$/i.test(file.name)) throw new Error("Choose a .heic or .heif image.");
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > HEIC_MAX_FILE_BYTES)
    throw new Error("Each HEIC file must be 20 MB or smaller.");
}
export async function hasHeicHeader(blob: Blob) {
  const bytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  return (
    text.slice(4, 8) === "ftyp" &&
    /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(text.slice(8, 12))
  );
}
