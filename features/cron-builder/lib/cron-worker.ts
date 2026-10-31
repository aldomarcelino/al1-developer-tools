import { previewCron } from "./preview";
self.onmessage = (
  event: MessageEvent<{ expression: string; timezone: string; after: string }>
) => {
  try {
    self.postMessage({
      result: previewCron(event.data.expression, event.data.timezone, event.data.after),
    });
  } catch (cause) {
    self.postMessage({
      error: cause instanceof Error ? cause.message : "Could not preview this schedule.",
    });
  }
};
