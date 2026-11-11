/** Codes per email address: at most `max` in `windowMs`, whatever IP asks. Caps mail bombing even when the IP
 * limit is dodged. Pure: the caller owns the map. */
export const SEND_MAX = 3;
export const SEND_WINDOW_MS = 10 * 60_000;

export function takeSendSlot(log: Map<string, number[]>, email: string, now: number) {
  const key = email.trim().toLowerCase();
  const recent = (log.get(key) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  if (recent.length >= SEND_MAX) {
    log.set(key, recent);
    return false;
  }
  log.set(key, [...recent, now]);
  // ponytail: in memory, one container. Forgets on restart, which only ever loosens it.
  if (log.size > 5000) for (const [k, ts] of log) if (ts.every((t) => now - t >= SEND_WINDOW_MS)) log.delete(k);
  return true;
}
