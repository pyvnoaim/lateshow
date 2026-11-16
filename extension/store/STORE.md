# Chrome Web Store listing

Paste these into the developer dashboard (chrome.google.com/webstore/devconsole). Visibility: **Unlisted**.
Upload: `pnpm ext:chrome` → `extension/lateshow-chrome.zip`.
Images: `screenshot-1280x800.png`, `promo-440x280.png` (remade from `slide.html` / `tile.html` with the popup's
`stub.js` demo data, see the comment in each file), icon = the 128 px one in the zip.

## Store listing

**Name:** Lateshow

**Summary** (132 max):
Marks what you finish on Netflix, Prime Video and Crunchyroll in Lateshow, and brings your watch history and watchlists along.

**Description:**
Lateshow is a personal tracker for films and series: what you watched, what's next, where it streams.

This extension connects your browser to your Lateshow account (lateshow.pyvno.xyz):

• Finish an episode or a film on Netflix, Prime Video or Crunchyroll, and it is marked in Lateshow by itself, with
the real time you watched it. A small notice says so, with Undo.
• Sync brings your watch history from those sites into Lateshow, only what's new since the last sync.
• Your watchlists come along too (one switch to turn that off).
• Only your profile counts on shared accounts.

It reads only those sites' own data while you are signed in there, never other sites, your browsing history or
passwords. Only finished titles leave your browser, never your progress. No ads, no tracking, nothing sold.

Free, non-commercial, made by one person. Needs a Lateshow account.

**Category:** Entertainment · **Language:** English

## Privacy practices

**Single purpose:**
Track what you watch on streaming sites in your Lateshow account: mark finished episodes and films, and import your
watch history and watchlists from Netflix, Prime Video and Crunchyroll.

**Permission justifications:**

- `storage`: keeps the browser's Lateshow key, your per-site switches, the profile that counts as yours, marks waiting
  to be sent while offline, and when each site was last synced.
- `alarms`: retries marks that couldn't be sent (offline, Lateshow restarting) every few minutes.
- Host `www.netflix.com`, `www.primevideo.com`, `www.crunchyroll.com`, `static.crunchyroll.com`: reads which episode
  plays and when it finishes (Crunchyroll's player runs in a frame on static.crunchyroll.com), and your watch history
  and watchlist from the site's own data when you sync.
- Host `lateshow.pyvno.xyz`: sends marks and imports to your Lateshow account, and connects the extension from
  Lateshow's Settings.
- Remote code: **No**. Everything runs from the package.

**Data usage** (check these):

- Personally identifiable information: no
- Authentication information: **yes** (the Lateshow key it keeps, sent only to Lateshow)
- Web history: **yes** (your watch history on those three sites, when you sync)
- User activity: **yes** (that you finished an episode or film there)
- Website content: **yes** (titles, seasons, episodes and watchlist entries from those sites)
- Everything else: no

Certify all three: not sold to third parties, not used for unrelated purposes, not used for credit decisions.

**Privacy policy URL:** https://lateshow.pyvno.xyz/privacy
