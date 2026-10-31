// Exact-origin content bridge. No network transport, wildcard origin or page commands.
(() => {
  if (
    location.pathname !== "/tools/qa-bug-report" ||
    !["http://localhost:3000", "https://dotools.com"].includes(location.origin)
  )
    return;
  const nonce = new URLSearchParams(location.hash.slice(1)).get("qa-capture");
  if (!nonce || !/^[a-f0-9-]{36}$/.test(nonce)) return;
  let delivered = false,
    received = false;
  const listener = (event: MessageEvent) => {
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      event.data?.nonce !== nonce
    )
      return;
    if (event.data?.type === "ramupod-qa-ready" && !received) {
      received = true;
      void chrome.runtime
        .sendMessage({ qa: "quick", action: "handoff", nonce })
        .then((result) => {
          window.postMessage(
            { type: "ramupod-qa-package", nonce, ...result },
            location.origin
          );
        })
        .catch(() =>
          window.postMessage(
            {
              type: "ramupod-qa-package",
              nonce,
              error:
                "Extension handoff unavailable. Download and import the capture instead.",
            },
            location.origin
          )
        );
    }
    if (event.data?.type === "ramupod-qa-accepted" && !delivered) {
      delivered = true;
      void chrome.runtime.sendMessage({ qa: "quick", action: "ack", nonce });
      window.removeEventListener("message", listener);
      clearInterval(tick);
    }
  };
  window.addEventListener("message", listener);
  // Handshake survives hydration timing; viewer must announce readiness before data delivery.
  const tick = setInterval(
    () => window.postMessage({ type: "ramupod-qa-offer", nonce }, location.origin),
    300
  );
  setTimeout(() => {
    clearInterval(tick);
    window.removeEventListener("message", listener);
  }, 30000);
})();
