import { describe, expect, it } from "vitest";
import crunchyroll from "@/lib/library/fixtures/crunchyroll-watch-history.json";
import netflix from "@/lib/library/fixtures/netflix-viewing-activity.json";
import prime from "@/lib/library/fixtures/prime-history.json";
import {
  checkRead,
  crunchyrollPage,
  netflixPage,
  Outdated,
  primeWidget,
  readCrunchyrollHistory,
  readNetflixHistory,
  readPrimeHistory,
} from "@/lib/library/importing";

// The fixtures are whole answers in each site's shape (trimmed, ids made up). Replace one with a fresh capture when a
// site changes: a reader that can't read it fails here, and in the extension the popup says it needs an update.
const titles = (rows: { title: string; type: string }[]) => rows.map((r) => `${r.type} ${r.title}`).sort();
const rename = (o: unknown, from: string, to: string) =>
  JSON.parse(JSON.stringify(o).replaceAll(`"${from}"`, `"${to}"`));

describe("a site's whole answer through its reader", () => {
  it("Prime: finds the widget deep in the page data and reads its days", () => {
    const widget = primeWidget(prime);
    expect(widget?.content?.content?.nextToken).toBe("token-2");
    const read = checkRead(readPrimeHistory(widget?.content?.content?.titles ?? []));
    expect(titles(read.rows)).toEqual(["movie Zodiac", "tv The Boys"]);
    expect(read.rows.find((r) => r.type === "tv")?.episodes?.map((e) => e.episode)).toEqual([1, 2]);
  });

  it("Netflix: reads the viewing activity out of the AUI answer", () => {
    const read = checkRead(readNetflixHistory(netflixPage(netflix).viewedItems ?? [], false));
    expect(titles(read.rows)).toEqual(["movie Okja", "tv BoJack Horseman"]);
  });

  it("Crunchyroll: reads a page of watch history, only what you finished", () => {
    const page = crunchyrollPage(crunchyroll);
    expect(page.meta?.next_page).toContain("page=2");
    expect(titles(checkRead(readCrunchyrollHistory(page.data, false)).rows)).toEqual(["tv Gachiakuta"]);
  });
});

describe("a site that changed shape needs an update", () => {
  it("a moved or renamed list is Outdated, not an empty history", () => {
    expect(primeWidget(rename(prime, "watch-history", "watch-history-v2"))).toBeNull();
    expect(() => netflixPage(rename(netflix, "viewingActivity", "activity"))).toThrow(Outdated);
    expect(() => crunchyrollPage(rename(crunchyroll, "data", "items"))).toThrow(Outdated);
  });

  it("entries none of which can be read are Outdated, a few odd ones are not", () => {
    const blank = { rows: [], skipped: 5 };
    expect(() => checkRead(blank)).toThrow(Outdated);
    expect(checkRead({ rows: [], skipped: 4 })).toEqual({ rows: [], skipped: 4 });
    expect(checkRead({ rows: [{}], skipped: 50 }).skipped).toBe(50);
    expect(checkRead({ rows: [], skipped: 0 }).rows).toEqual([]);
  });

  it("Netflix entries that lost their names can't be read", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ movieID: i + 1, date: 1794772800000, name: "Okja" }));
    expect(() => checkRead(readNetflixHistory(items, false))).toThrow(Outdated);
  });
});
