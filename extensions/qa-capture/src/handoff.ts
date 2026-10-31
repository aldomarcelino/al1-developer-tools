export const VIEWERS = [
  "http://localhost:3000",
  "https://ramupod.com",
  "https://dotools.com",
] as const;
export const VIEWER_PATH = "/tools/qa-bug-report";
export function viewerOrigin(value: unknown) {
  if (typeof value !== "string" || !VIEWERS.some((origin) => origin === value))
    throw new Error("Choose an explicitly allowed Ramupod origin.");
  return value;
}
export function validRecipient(
  sender: { id?: string; tab?: { id?: number; url?: string }; frameId?: number },
  extensionId: string,
  handoff: { tabId: number; origin: string; nonce: string; expires: number },
  nonce: unknown
) {
  if (
    sender.id !== extensionId ||
    sender.frameId !== 0 ||
    sender.tab?.id !== handoff.tabId ||
    nonce !== handoff.nonce ||
    Date.now() > handoff.expires
  )
    return false;
  try {
    const url = new URL(sender.tab?.url ?? "");
    return url.origin === viewerOrigin(handoff.origin) && url.pathname === VIEWER_PATH;
  } catch {
    return false;
  }
}
