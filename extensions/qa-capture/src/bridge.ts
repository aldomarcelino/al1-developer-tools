// Exact-origin content bridge. No network transport, wildcard origin or page commands.
(() => {
  if (
    !["http://localhost:43187", "https://ramupod.com", "https://dotools.com"].includes(
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
          .then(async (result) => {
            if (result.error) throw new Error(String(result.error));
            const length = result.byteLength;
            if (
              typeof length !== "number" ||
              !Number.isSafeInteger(length) ||
              length <= 0
            ) {
              throw new Error("Invalid recording size. Try Finish again.");
            }
            // Keep every Chrome runtime message small; large number arrays can
            // exceed Chrome's message-size limit even for modest WebM files.
            const bytes = new Uint8Array(length);
            for (let offset = 0; offset < length;) {
              const chunk = await chrome.runtime.sendMessage({
                qa: "quick",
                action: "rec-read",
                nonce: recNonce,
                offset,
              });
              if (
                chunk.error ||
                chunk.offset !== offset ||
                !Array.isArray(chunk.buffer) ||
                !chunk.buffer.length ||
                chunk.buffer.length > 256 * 1024 ||
                offset + chunk.buffer.length > length
              ) {
                throw new Error(String(chunk.error ?? "Video transfer was interrupted."));
              }
              bytes.set(chunk.buffer, offset);
              offset += chunk.buffer.length;
            }
            window.postMessage(
              {
                type: "ramupod-recorder-package",
                nonce: recNonce,
                ...result,
                blobData: bytes,
              },
              location.origin
            );
          })
          .catch(() =>
            window.postMessage(
              {
                type: "ramupod-recorder-package",
                nonce: recNonce,
                error:
                  "Video transfer failed. Open the extension and try Finish again; your video is retained.",
              },
              location.origin
            )
          );
      }
      if (event.data?.type === "ramupod-recorder-accepted" && !delivered) {
        delivered = true;
        void chrome.runtime.sendMessage({
          qa: "quick",
          action: "rec-ack",
          nonce: recNonce,
        });
        window.removeEventListener("message", listener);
        clearInterval(tick);
      }
    };
    window.addEventListener("message", listener);
    const tick = setInterval(
      () =>
        window.postMessage(
          { type: "ramupod-recorder-offer", nonce: recNonce },
          location.origin
        ),
      300
    );
    setTimeout(() => {
      clearInterval(tick);
      window.removeEventListener("message", listener);
    }, 300000);
  }
})();
