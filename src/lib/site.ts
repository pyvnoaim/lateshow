/**
 * The public address. Link previews (Open Graph) need absolute URLs, and those are written into pages at build time,
 * where the env isn't there. Change it together with BETTER_AUTH_URL in Portainer when the domain changes.
 */
export const SITE_URL = "https://lateshow.pyvno.xyz";

/**
 * The extension's Chrome Web Store page (Unlisted, item olpjkleefegccejonlngdnnphnapcbfj). null until Google approves
 * the first version (submitted 2026-11-16), then Settings › Extension offers "Add to Chrome": set it to
 * "https://chromewebstore.google.com/detail/olpjkleefegccejonlngdnnphnapcbfj".
 */
export const CHROME_STORE_URL: string | null = null;
