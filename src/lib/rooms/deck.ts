import "server-only";
import { serviceIdsFor } from "@/lib/settings/queries";
import { discoverOnSubscription, type MediaType } from "@/lib/tmdb";
import { roomServices, seededShuffle } from "./swipe";

export const DECK_SIZE = 20;

/**
 * A room's shared deck: well rated titles on the services everyone in it has (see roomServices), the same 20 for
 * everyone, in an order seeded by the room. `round` gives Play again a different deck.
 */
export async function buildDeck(
  code: string,
  kind: MediaType,
  memberIds: string[],
  country: string,
  round = 0,
  size = DECK_SIZE,
  /** a list's titles instead of discover (still shuffled per round) */
  fromIds?: number[],
) {
  const perPerson = await Promise.all(memberIds.map((id) => serviceIdsFor(id, country)));
  const services = roomServices(perPerson);
  if (fromIds) return { services, deck: seededShuffle(fromIds, `${code}:${round}`).slice(0, size) };
  const first = (round % 4) + 1; // discover pages 1-2, then 2-3... so each round brings new titles
  const pages = await Promise.all(
    [first, first + 1].map((page) => discoverOnSubscription(kind, page, country, services).catch(() => [])),
  );
  const ids = [
    ...new Set(
      pages
        .flat()
        .filter((c) => c.poster_path)
        .map((c) => c.id),
    ),
  ];
  return { services, deck: seededShuffle(ids, `${code}:${round}`).slice(0, size) };
}
