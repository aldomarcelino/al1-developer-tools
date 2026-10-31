import { optimizeSvg } from "./optimize-svg";
import type { SvgRequest, SvgResponse } from "./options";
self.onmessage = (event: MessageEvent<SvgRequest>) => {
  let response: SvgResponse;
  try {
    response = { result: optimizeSvg(event.data) };
  } catch (cause) {
    response = {
      error: cause instanceof Error ? cause.message : "Could not process this SVG.",
    };
  }
  self.postMessage(response);
};
