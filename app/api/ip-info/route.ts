import { ipInfoResponse } from "@/features/ip-inspector/lib/ip-info";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return ipInfoResponse(request);
}
