// The few extension APIs Lateshow's extension uses, typed by hand (Chrome and Firefox both offer them as `chrome.*`).
// ponytail: hand-written, swap for @types/chrome once it uses more than these.

type Tab = { id?: number; url?: string };

declare namespace chrome {
  namespace runtime {
    const onMessage: {
      addListener(
        fn: (message: { type?: string }, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void,
      ): void;
    };
  }
  namespace tabs {
    function query(q: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    function sendMessage<T>(tabId: number, message: { type: string }): Promise<T>;
    function create(p: { url: string }): Promise<Tab>;
    function update(tabId: number, p: { url: string }): Promise<Tab>;
  }
  namespace storage {
    const local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(key: string): Promise<void>;
    };
    const onChanged: {
      addListener(fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void): void;
    };
  }
  namespace alarms {
    function create(name: string, info: { periodInMinutes: number }): void;
    const onAlarm: { addListener(fn: (alarm: { name: string }) => void): void };
  }
  namespace runtime {
    function sendMessage<T>(message: { type: string; [key: string]: unknown }): Promise<T>;
  }
  namespace permissions {
    function contains(p: { origins: string[] }): Promise<boolean>;
    function request(p: { origins: string[] }): Promise<boolean>;
  }
}

/** The logo's SVG source, built in by esbuild (loader text) */
declare module "@/app/icon.svg" {
  const svg: string;
  export default svg;
}

/** Lateshow's address, set at build time (production, or http://localhost:3000 for `pnpm ext:dev`) */
declare const __LATESHOW__: string;
/** The same without a port, for site patterns (they can't hold one) */
declare const __LATESHOW_MATCH__: string;
