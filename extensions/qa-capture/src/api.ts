import type {
  Session,
  EvidencePackage,
} from "../../../features/qa-bug-report/lib/model.ts";
export type PanelApi = {
  snapshot: () => Session | null;
  start: (environment: string, build: string) => Promise<void>;
  stop: () => void;
  clear: () => Promise<void>;
  clearAll: () => Promise<void>;
  mark: (description: string) => void;
  export: () => EvidencePackage;
  subscribe: (listener: (session: Session | null) => void) => () => void;
};
declare global {
  interface Window {
    qaCapture?: PanelApi;
  }
}
