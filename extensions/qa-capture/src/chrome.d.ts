// Narrow adapter for the documented Chrome APIs used by this extension.
interface QaDevtoolsRequest {
  getContent(callback: (content: string, encoding: string) => void): void;
}
interface QaChrome {
  runtime: {
    id: string;
    getURL(path: string): string;
    sendMessage(message: unknown): Promise<Record<string, unknown>>;
    onMessage: {
      removeListener(
        listener: (
          message: unknown,
          sender: QaSender,
          reply: (value: unknown) => void
        ) => boolean | void
      ): void;
      addListener(
        listener: (
          message: unknown,
          sender: QaSender,
          reply: (value: unknown) => void
        ) => boolean | void
      ): void;
    };
  };
  permissions: { request(options: { permissions: string[] }): Promise<boolean> };
  tabs: {
    query(options: { active: boolean; currentWindow: boolean }): Promise<QaTab[]>;
    get(id: number): Promise<QaTab>;
    update(id: number, options: { active: boolean }): Promise<QaTab>;
    create(options: { url: string }): Promise<QaTab>;
    sendMessage(id: number, message: unknown): Promise<unknown>;
    captureVisibleTab(windowId: number, options: { format: "png" }): Promise<string>;
    onRemoved: { addListener(listener: (id: number) => void): void };
    onUpdated: {
      addListener(
        listener: (
          id: number,
          change: { status?: string; url?: string },
          tab: QaTab
        ) => void
      ): void;
    };
  };
  scripting: {
    executeScript(options: {
      target: { tabId: number };
      files: string[];
    }): Promise<unknown>;
  };
  debugger: {
    attach(target: { tabId: number }, version: string): Promise<void>;
    detach(target: { tabId: number }): Promise<void>;
    sendCommand(
      target: { tabId: number },
      method: string,
      params?: Record<string, unknown>
    ): Promise<Record<string, unknown>>;
    onEvent: {
      addListener(
        listener: (target: { tabId?: number }, method: string, params?: unknown) => void
      ): void;
    };
    onDetach: {
      addListener(listener: (target: { tabId?: number }, reason: string) => void): void;
    };
  };
  devtools: {
    inspectedWindow: {
      tabId: number;
      eval(
        expression: string,
        callback: (
          result: unknown,
          exception?: { isException?: boolean; value?: string }
        ) => void
      ): void;
    };
    network: {
      onRequestFinished: {
        addListener(callback: (request: QaDevtoolsRequest) => void): void;
      };
      onNavigated: { addListener(callback: (url: string) => void): void };
    };
    panels: {
      create(
        title: string,
        iconPath: string,
        pagePath: string,
        callback: (panel: {
          onShown: { addListener(callback: (window: Window) => void): void };
        }) => void
      ): void;
    };
  };
  windows: { update(id: number, options: { focused: boolean }): Promise<unknown> };
  storage: {
    session: {
      get(key: string | string[]): Promise<Record<string, unknown>>;
      set(value: Record<string, unknown>): Promise<void>;
      remove(key: string): Promise<void>;
    };
    local: {
      get(key: string | string[]): Promise<Record<string, unknown>>;
      set(value: Record<string, unknown>): Promise<void>;
      remove(key: string): Promise<void>;
      clear(): Promise<void>;
    };
  };
  tabCapture?: {
    getMediaStreamId(options: { targetTabId?: number }): Promise<string>;
  };
  offscreen?: {
    createDocument(options: {
      url: string;
      reasons: string[];
      justification: string;
    }): Promise<void>;
    closeDocument(): Promise<void>;
    hasDocument?(): Promise<boolean>;
  };
  action?: {
    setBadgeText(options: { text: string }): Promise<void>;
    setBadgeBackgroundColor?(options: { color: string }): Promise<void>;
  };
}
declare const chrome: QaChrome;

interface QaTab {
  id?: number;
  url?: string;
  windowId: number;
  active?: boolean;
}
interface QaSender {
  id?: string;
  url?: string;
  tab?: QaTab;
  frameId?: number;
}

type QaSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
};
interface Window {
  ramupodUI?: {
    icon: (name: string) => string;
    notify: (message: string) => void;
    dismiss: () => void;
    button: (
      parent: Node,
      name: string,
      icon: string,
      action: () => void,
      className?: string
    ) => HTMLButtonElement;
    editor: (
      image: string,
      options: {
        selection?: QaSelection;
        saveLabel?: string;
        onSave: (data: string) => Promise<void>;
        onClose: () => void;
      }
    ) => Promise<void>;
    select: (
      onSelect: (selection: QaSelection) => void,
      onCancel: () => void
    ) => () => void;
  };
}
