/**
 * Profile pictures, stored in Better Auth's `user.image`: "c:<tone>" (a glass color with your initial) or
 * "p:<TMDB profile path>" (a cast photo, through our image server). Better Auth lets clients write `image` too,
 * so nothing is ever rendered unless it parses here. Pure.
 */
export const TONES = ["icy", "lavender", "mint", "peach", "rose", "sand"] as const;
export type Tone = (typeof TONES)[number];
export type Avatar = { kind: "tone"; tone: Tone } | { kind: "photo"; path: string } | null;

const PHOTO = /^p:(\/[A-Za-z0-9_-]{8,64}\.(?:jpg|png))$/;

export function parseAvatar(image: string | null | undefined): Avatar {
  if (!image) return null;
  if (image.startsWith("c:")) {
    const tone = image.slice(2) as Tone;
    return TONES.includes(tone) ? { kind: "tone", tone } : null;
  }
  const m = PHOTO.exec(image);
  return m ? { kind: "photo", path: m[1] } : null;
}

/** The photo as a TMDB image URL, always shown through our image server (next/image), never fetched by browsers. */
export const photoUrl = (path: string) => `https://image.tmdb.org/t/p/w185${path}`;

/** What may be saved: a known tone, a TMDB-shaped photo path, or "" for the default. */
export const isAvatarValue = (v: string) => v === "" || parseAvatar(v) !== null;
