export function deviceError(error: unknown): string {
  const name =
    typeof error === "object" && error
      ? String((error as { name?: string }).name ?? "")
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "Camera or microphone access is blocked. Allow the selected devices for Ramupod in Chrome and your system privacy settings, then try again.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "A selected camera or microphone was not found. Connect it, or uncheck that device in the extension popup.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "A selected device could not be opened. Close other apps using it and check your system camera/microphone settings.";
  return error instanceof Error
    ? error.message
    : "Could not prepare the selected devices. Check Chrome and system permissions.";
}
