/**
 * The public address. Link previews (Open Graph) need absolute URLs, and those are written into pages at build time,
 * where the env isn't there. Change it together with BETTER_AUTH_URL in Portainer when the domain changes.
 */
export const SITE_URL = "https://lateshow.pyvno.xyz";

/** The extension's Chrome Web Store page (Unlisted, approved 2026-11-17). Settings › Extension offers "Add to Chrome". */
export const CHROME_STORE_URL: string | null =
  "https://chromewebstore.google.com/detail/olpjkleefegccejonlngdnnphnapcbfj";
