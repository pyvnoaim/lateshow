/**
 * Profile pictures: your initial on a glass tone, stored in Better Auth's `user.image` as "c:<tone>". Better Auth
 * lets clients write `image` too, so nothing is ever rendered unless it parses here. Pure.
 */
export const TONES = ["icy", "lavender", "mint", "peach", "rose", "sand"] as const;
export type Tone = (typeof TONES)[number];

export function parseTone(image: string | null | undefined): Tone | null {
  if (!image?.startsWith("c:")) return null;
  const tone = image.slice(2) as Tone;
  return TONES.includes(tone) ? tone : null;
}

/** What may be saved: a known tone, or "" for the default (icy). */
export const isAvatarValue = (v: string) => v === "" || parseTone(v) !== null;
