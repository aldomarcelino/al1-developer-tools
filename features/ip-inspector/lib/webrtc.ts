import { normalizeIp, isPrivateIp } from "./ip.ts";
export type RtcAddress = {
  address: string;
  kind: "local / private" | "public" | "mDNS (hidden)";
  candidateType: string;
};
export type RtcResult = {
  addresses: RtcAddress[];
  status: "complete" | "timed-out" | "unsupported";
};

export function parseCandidate(candidate: string): RtcAddress | null {
  const parts = candidate.trim().split(/\s+/);
  const address = parts[4];
  if (!address) return null;
  const ip = normalizeIp(address);
  if (!ip && !/^[a-zA-Z0-9.-]+\.local$/.test(address)) return null;
  return {
    address: ip ?? address,
    kind: !ip ? "mDNS (hidden)" : isPrivateIp(ip) ? "local / private" : "public",
    candidateType: parts[parts.indexOf("typ") + 1] ?? "unknown",
  };
}

/** No microphone/camera access. Caller owns cancellation (including unmount). */
export async function inspectWebRtc(signal: AbortSignal): Promise<RtcResult> {
  if (typeof RTCPeerConnection === "undefined")
    return { addresses: [], status: "unsupported" };
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  const addresses: RtcAddress[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  try {
    return await new Promise<RtcResult>((resolve, reject) => {
      const finish = (status: RtcResult["status"]) => resolve({ addresses, status });
      abort = () => reject(new DOMException("Cancelled", "AbortError"));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      peer.onicecandidate = (event) => {
        if (!event.candidate) {
          finish("complete");
          return;
        }
        const found = parseCandidate(event.candidate.candidate);
        if (found && !addresses.some((entry) => entry.address === found.address))
          addresses.push(found);
      };
      timer = setTimeout(() => finish("timed-out"), 6500);
      peer.createDataChannel("inspection");
      void peer
        .createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .catch(reject);
    });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    peer.onicecandidate = null;
    peer.close();
  }
}
