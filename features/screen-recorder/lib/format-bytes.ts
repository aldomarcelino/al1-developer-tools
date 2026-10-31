/**
 * Formats a byte size into a human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (isNaN(bytes) || bytes <= 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}
