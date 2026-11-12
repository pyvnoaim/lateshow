import { createHmac, timingSafeEqual } from "node:crypto";

/** Pure helpers for the calendar feed: the private link's token and the .ics text. The secret comes from the caller. */

const sign = (userId: string, secret: string) =>
  // own key for this purpose, so the auth secret is never used for anything but auth
  createHmac("sha256", createHmac("sha256", secret).update("calendar-feed:v1").digest())
    .update(userId)
    .digest("base64url")
    .slice(0, 22);

/** `<userId>.<hmac>`: anyone with it reads that user's calendar, nothing else. */
export function makeCalendarToken(userId: string, secret: string) {
  return `${userId}.${sign(userId, secret)}`;
}

/** The user id when the token is one we made, else null. */
export function verifyCalendarToken(token: string, secret: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(userId, secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}

export type CalendarEvent = { uid: string; date: string; summary: string; url: string };

// TMDB text could carry a lone CR or other control characters: every line break becomes \n, the rest is dropped,
// so nothing can start a new ICS property
const escape = (text: string) => clean(text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r\n|\r|\n/g, "\\n"));
const clean = (text: string) => text.replace(/[\x00-\x1f\x7f]/g, "");

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545), never inside a UTF-8 character. */
export function fold(line: string) {
  const out: string[] = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (octets + size > limit) {
      out.push(current);
      current = "";
      octets = 0;
    }
    current += ch;
    octets += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** All-day events as an iCalendar file, CRLF line ends. `now` stamps every event. */
export function buildIcs(events: CalendarEvent[], now: Date) {
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lateshow//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Lateshow",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events.flatMap((e) => {
      const day = e.date.replace(/-/g, "");
      const next = new Date(Date.parse(e.date) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
      return [
        "BEGIN:VEVENT",
        `UID:${clean(e.uid)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day}`,
        `DTEND;VALUE=DATE:${next}`,
        `SUMMARY:${escape(e.summary)}`,
        `URL:${clean(e.url)}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
