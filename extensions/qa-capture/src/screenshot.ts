(() => {
  if (
    document.getElementById("ramupod-screenshot-selection") ||
    document.getElementById("ramupod-image-editor")
  )
    return;
  const ui = window.ramupodUI;
  if (!ui) return;
  let token = "",
    exited = false,
    cancelSelection: (() => void) | undefined;
  const send = async (action: string, extra: Record<string, unknown> = {}) => {
    const r = await chrome.runtime.sendMessage({ qa: "quick", action, token, ...extra });
    if (r.error) throw new Error(String(r.error));
    return r;
  };
  const exit = () => {
    if (exited) return;
    exited = true;
    chrome.runtime.onMessage.removeListener(listener);
    void send("shot-exit").catch(() => {});
  };
  const listener = (m: unknown) => {
    if ((m as { qa?: string })?.qa === "shot-remove") {
      cancelSelection?.();
      exit();
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  void (async () => {
    const state = await send("status"),
      activity = state.activity as { token?: string; mode?: string };
    if (activity?.mode !== "screenshot" || !activity.token) {
      exit();
      return;
    }
    token = activity.token;
    cancelSelection = ui.select((region) => {
      void (async () => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        );
        const result = await send("shot-image");
        await ui.editor(String(result.image), {
          selection: region,
          saveLabel: "Download screenshot",
          onSave: async (data) => {
            const blob = new Blob(
              [Uint8Array.from(atob(data.slice(22)), (c) => c.charCodeAt(0))],
              { type: "image/png" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ramupod-screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          },
          onClose: exit,
        });
      })().catch((e) => {
        ui.notify(
          e instanceof Error
            ? e.message
            : "Screenshot unavailable. Try again from the extension."
        );
        exit();
      });
    }, exit);
  })().catch(exit);
})();
