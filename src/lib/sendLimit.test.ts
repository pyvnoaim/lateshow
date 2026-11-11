import { describe, expect, it } from "vitest";
import { refundSendSlot, SEND_MAX, SEND_WINDOW_MS, takeSendSlot } from "./sendLimit";

describe("takeSendSlot", () => {
  it("allows SEND_MAX per window per address, case-insensitive, then frees up", () => {
    const log = new Map<string, number[]>();
    for (let i = 0; i < SEND_MAX; i++) expect(takeSendSlot(log, "A@x.com", i)).toBe(true);
    expect(takeSendSlot(log, "a@x.com", 10)).toBe(false);
    refundSendSlot(log, "A@X.com");
    expect(takeSendSlot(log, "a@x.com", 11)).toBe(true);
    expect(takeSendSlot(log, "b@x.com", 10)).toBe(true);
    expect(takeSendSlot(log, "a@x.com", SEND_WINDOW_MS + 1)).toBe(true);
  });
});
