import { describe, expect, it } from "vitest";
import { applyUpdate, canControl, playbackUpdate, positionAt } from "./playback";

describe("playback", () => {
  const p = applyUpdate({ playing: true, position: 600 }, { id: "u1", name: "Mara" }, 1_000_000);

  it("runs on from the server's clock while playing, stands still when paused", () => {
    expect(positionAt(p, 1_004_500)).toBe(604.5);
    expect(positionAt({ ...p, playing: false }, 1_004_500)).toBe(600);
    expect(positionAt(p, 999_000)).toBe(600); // a clock a little behind never runs it backwards
  });

  it("lets the room maker decide who may pause and skip", () => {
    expect(canControl({ control: "everyone", hostId: "h" }, "u1")).toBe(true);
    expect(canControl({ control: "host", hostId: "h" }, "u1")).toBe(false);
    expect(canControl({ control: "host", hostId: "h" }, "h")).toBe(true);
  });

  it("takes only sane updates", () => {
    expect(playbackUpdate.safeParse({ playing: true, position: 12.5, season: 1, episode: 3 }).success).toBe(true);
    expect(playbackUpdate.safeParse({ playing: true, position: -1 }).success).toBe(false);
    expect(playbackUpdate.safeParse({ playing: "yes", position: 1 }).success).toBe(false);
  });
});
