/**
 * Formats a duration in milliseconds into a readable HH:MM:SS string.
 */
export function formatDuration(ms: number): string {
  if (isNaN(ms) || ms < 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
