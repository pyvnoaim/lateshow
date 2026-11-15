// Runs in Netflix's own page (the page's world, not the extension's): Netflix's viewing activity API wants the
// profile's id and the site's build id, which only the page's app holds (window.netflix), and marking only marks
// your own profile (its name). This hands them to the
// Lateshow script on this page when it asks (netflix.ts). Nothing here sends anything anywhere.
(() => {
  window.addEventListener("message", (e) => {
    if (e.source !== window || (e.data as { type?: string } | null)?.type !== "lateshow:nf-ask") return;
    const models = (
      window as { netflix?: { reactContext?: { models?: Record<string, { data?: Record<string, string> }> } } }
    ).netflix?.reactContext?.models;
    const info = models?.userInfo?.data;
    window.postMessage(
      {
        type: "lateshow:nf-ids",
        guid: info?.guid ?? info?.userGuid ?? null,
        name: info?.name ?? null,
        build: models?.serverDefs?.data?.BUILD_IDENTIFIER ?? null,
      },
      location.origin,
    );
  });
})();
