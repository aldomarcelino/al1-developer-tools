// Exact-origin content bridge. No network transport, wildcard origin or page commands.
(() => {
  if (
    !["http://localhost:3000", "https://ramupod.com", "https://dotools.com"].includes(
      location.origin
    )
  ) {
    return;
  }

  // Handle QA Bug Report handoff
  if (location.pathname === "/tools/qa-bug-report") {
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
    const tick = setInterval(
      () => window.postMessage({ type: "ramupod-qa-offer", nonce }, location.origin),
      300
    );
    setTimeout(() => {
      clearInterval(tick);
      window.removeEventListener("message", listener);
    }, 30000);
  }

  // Handle Screen Recorder handoff
  if (location.pathname === "/tools/screen-recorder") {
    const recNonce = new URLSearchParams(location.hash.slice(1)).get(
      "companion-recording"
    );
    if (!recNonce || !/^[a-f0-9-]{36}$/.test(recNonce)) return;
    let delivered = false,
      received = false;
    const listener = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.nonce !== recNonce
      )
        return;
      if (event.data?.type === "ramupod-recorder-ready" && !received) {
        received = true;
        void chrome.runtime
          .sendMessage({ qa: "quick", action: "rec-handoff", nonce: recNonce })
          .then((result) => {
            window.postMessage(
              { type: "ramupod-recorder-package", nonce: recNonce, ...result },
              location.origin
            );
          })
          .catch(() =>
            window.postMessage(
              {
                type: "ramupod-recorder-package",
                nonce: recNonce,
                error: "Extension handoff unavailable.",
              },
              location.origin
            )
          );
      }
      if (event.data?.type === "ramupod-recorder-accepted" && !delivered) {
        delivered = true;
        window.removeEventListener("message", listener);
        clearInterval(tick);
      }
    };
    window.addEventListener("message", listener);
    const tick = setInterval(
      () => window.postMessage({ type: "ramupod-recorder-offer", nonce: recNonce }, location.origin),
      300
    );
    setTimeout(() => {
      clearInterval(tick);
      window.removeEventListener("message", listener);
    }, 30000);
  }
})();
