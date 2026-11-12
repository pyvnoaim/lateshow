import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PosterLink } from "@/components/PosterLink";
import { buttonStyles } from "@/components/ui/button";
import { PosterGrid, PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { getSession } from "@/lib/auth";
import { deleteList, renameList, setInList, setListVisibility, swipeList } from "@/lib/lists/actions";
import { getList } from "@/lib/lists/queries";
import { VISIBILITY } from "@/lib/lists/rules";
import { getLanguage } from "@/lib/region";
import { getTitle, titleToCard, type Card } from "@/lib/tmdb";
import { ListOwnerBar } from "./components/ListOwnerBar";
import { RemoveFromList } from "./components/RemoveFromList";
import { SwipeListButton } from "./components/SwipeListButton";

/** /l/<id>: a list. The owner can rename, share, delete and take titles off. Anyone allowed to see it can browse. */
export async function ListPage({ id }: { id: string }) {
  if (!/^[a-z0-9]{16}$/.test(id)) notFound();
  const session = await getSession();
  const l = await getList(id, session?.user.id ?? null);
  if (!l) notFound(); // private, or not your friend's: the same 404 as a list that doesn't exist
  const mine = session?.user.id === l.userId;
  const lang = await getLanguage();
  // full TMDB cards so captions match every other poster (cached per title and language)
  // ponytail: one lookup per title, fine for lists of a few dozen. Store year and genre on list_item if lists get long.
  const cards: Card[] = await Promise.all(
    l.items.map((i) =>
      getTitle(i.mediaType, String(i.tmdbId), lang)
        .then((t) => titleToCard(t, i.mediaType))
        .catch(() => ({ id: i.tmdbId, media_type: i.mediaType, title: i.title, poster_path: i.posterPath })),
    ),
  );
  const count = `${l.items.length} ${l.items.length === 1 ? "title" : "titles"}`;

  return (
    <div className="flex flex-col gap-section">
      <div className="flex rise flex-col gap-6">
        <Link href={`/u/${l.owner}`} className="flex w-fit items-center gap-3 text-small text-muted hover:text-fg">
          <Avatar name={l.owner ?? "?"} image={l.ownerImage} size="sm" />
          {mine ? "Your list" : `A list by ${l.owner}`}
        </Link>
        <h1 className="text-page leading-none font-bold text-balance">
          {l.name}
          <br />
          <span className="text-muted">{count}.</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {session && l.items.length > 1 && <SwipeListButton start={swipeList.bind(null, l.id)} />}
          {mine && (
            <ListOwnerBar
              name={l.name}
              visibility={l.visibility}
              options={VISIBILITY}
              setVisibility={setListVisibility.bind(null, l.id)}
              rename={renameList.bind(null, l.id)}
              remove={deleteList.bind(null, l.id)}
            />
          )}
        </div>
      </div>
      {l.items.length === 0 ? (
        <div className="flex flex-col items-start gap-5">
          <p className="text-body text-muted">
            Nothing on it yet.
            {mine && (
              <>
                <br />
                On any title page, the list button adds it here.
              </>
            )}
          </p>
          {mine && (
            <Link href="/search" className={buttonStyles("primary", "sm")}>
              Find something
            </Link>
          )}
        </div>
      ) : (
        <PosterGrid>
          {cards.map((c, i) => (
            <div key={`${c.media_type}-${c.id}`} className="flex flex-col gap-1">
              <PosterLink card={c} index={i} />
              {mine && (
                <RemoveFromList
                  remove={setInList.bind(
                    null,
                    {
                      type: l.items[i].mediaType,
                      tmdbId: l.items[i].tmdbId,
                      title: l.items[i].title,
                      posterPath: l.items[i].posterPath,
                    },
                    l.id,
                    false,
                  )}
                />
              )}
            </div>
          ))}
        </PosterGrid>
      )}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-6">
        <div className="h-5 w-32 sk rounded-full" />
        <div className="h-24 w-2/3 sk rounded-poster" />
      </div>
      <PosterGridSkeleton />
    </div>
  );
}

/** Tab title: the list's name, only for someone who may see it. */
export async function listMetadata(id: string) {
  const session = await getSession();
  const l = /^[a-z0-9]{16}$/.test(id) ? await getList(id, session?.user.id ?? null) : null;
  return { title: l ? `${l.name} · Lateshow` : "List · Lateshow" };
}
