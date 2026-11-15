// Runs in Crunchyroll's own page (the page's world, not the extension's): Crunchyroll's API needs the login token its
// app keeps in memory. This notes it, and your account id, from the app's own requests to its API, and hands both to
// the Lateshow script on this page when it asks (crunchyroll.ts). Nothing here sends anything anywhere.
(() => {
  let auth: string | null = null;
  let account: string | null = null;
  const note = (url: string, value: string | null) => {
    if (value && /^Bearer\s/i.test(value)) auth = value;
    account = /\/content\/v2\/([0-9a-f-]{36})\//i.exec(url)?.[1] ?? account;
  };

  const fetchFn = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      note(url, headers.get("authorization"));
    } catch {
      // noting is best effort, the app's request goes out unchanged either way
    }
    return fetchFn.call(this, input, init);
  };
  const open = XMLHttpRequest.prototype.open;
  const setHeader = XMLHttpRequest.prototype.setRequestHeader;
  const urls = new WeakMap<XMLHttpRequest, string>();
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest["open"]>) {
    urls.set(this, String(args[1]));
    return open.apply(this, args);
  } as XMLHttpRequest["open"];
  XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    if (name.toLowerCase() === "authorization") note(urls.get(this) ?? "", value);
    return setHeader.call(this, name, value);
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window || (e.data as { type?: string } | null)?.type !== "lateshow:cr-ask") return;
    window.postMessage({ type: "lateshow:cr-auth", auth, account }, location.origin);
  });
})();
