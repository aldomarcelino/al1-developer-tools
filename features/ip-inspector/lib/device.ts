export type DeviceInfo = ReturnType<typeof inspectDevice>;
type ExtendedNavigator = Navigator & {
  deviceMemory?: number;
  connection?: {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  userAgentData?: { platform?: string };
};

export function inspectDevice() {
  const nav = navigator as ExtendedNavigator;
  const ua = nav.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Microsoft Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Unknown";
  const os =
    /iPhone|iPad|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
      ? "iOS / iPadOS"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac/.test(ua)
            ? "macOS"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : "Unknown";
  return {
    userAgent: ua,
    browser,
    operatingSystem: nav.userAgentData?.platform ?? os,
    screenResolution: `${window.screen.width} × ${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    cpuCores: nav.hardwareConcurrency || null,
    estimatedRamGB: nav.deviceMemory ?? null,
    connectionType: nav.connection?.type ?? null,
    effectiveConnection: nav.connection?.effectiveType ?? null,
    downlinkMbps: nav.connection?.downlink ?? null,
    rttMs: nav.connection?.rtt ?? null,
    saveData: nav.connection?.saveData ?? null,
    language: nav.language,
    languages: [...nav.languages],
    cookiesEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack ?? "Not specified",
    secureContext: window.isSecureContext,
  };
}
