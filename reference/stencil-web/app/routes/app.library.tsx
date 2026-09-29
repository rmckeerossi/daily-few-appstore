import { useMemo, useState } from "react";
import { Link } from "react-router";
import { asc, inArray } from "drizzle-orm";
import { LuLibrary, LuFilter } from "react-icons/lu";
import { Text } from "~stencil/ui/strings";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { decks, cards } from "~/generated/db-schema";
import {
  PhoneShell,
  Eyebrow,
  DisplayTitle,
  SegmentedControl,
  DeckTile,
} from "~/components/design";
import type { Route } from "./+types/app.library";

export async function loader({ request, context }: Route.LoaderArgs) {
  // Gate the route to signed-in users; the deck library itself is shared.
  await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  // Decks are the shared question library — read globally, not per-user.
  const deckRows = await db
    .select()
    .from(decks)
    .orderBy(asc(decks.sortOrder));

  // cardCount is not a column — derive it by counting cards per deck.
  const deckIds = deckRows.map((d) => d.id);
  const countByDeck: Record<string, number> = {};
  if (deckIds.length > 0) {
    const cardRows = await db
      .select({ id: cards.id, deckId: cards.deckId })
      .from(cards)
      .where(inArray(cards.deckId, deckIds));
    for (const c of cardRows) {
      countByDeck[c.deckId] = (countByDeck[c.deckId] ?? 0) + 1;
    }
  }

  const decksOut = deckRows.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? "",
    type: d.type,
    season: d.season ?? "",
    artStyle: d.artStyle ?? "monthly",
    isCurrent: Boolean(d.isCurrent),
    cardCount: countByDeck[d.id] ?? 0,
  }));

  // Current monthly deck first, then by sortOrder.
  decksOut.sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

  return { decks: decksOut };
}

type DeckView = Awaited<ReturnType<typeof loader>>["decks"][number];

function DeckMeta({ deck }: { deck: DeckView }) {
  return (
    <span>
      <Text id={deck.type === "season" ? "library.type.season" : "library.type.monthly"} />
      {" · "}
      <Text id="library.deckMeta" vars={{ count: deck.cardCount }} />
    </span>
  );
}

function DeckTileLink({ deck, featured }: { deck: DeckView; featured: boolean }) {
  const badge = featured ? (
    <Text id="library.badgeCurrent" />
  ) : deck.type === "season" ? (
    <Text id="library.badgeSeason" />
  ) : undefined;

  return (
    <Link
      to={`/app/decks/${deck.id}`}
      className="block transition-transform duration-fast ease-standard active:translate-y-px"
    >
      <DeckTile
        name={deck.name}
        description={deck.description}
        meta={<DeckMeta deck={deck} />}
        badge={badge}
        artStyle={deck.artStyle}
        artHeight={featured ? 170 : 120}
      />
    </Link>
  );
}

export default function Library({ loaderData }: Route.ComponentProps) {
  const { decks: allDecks } = loaderData;
  const [segment, setSegment] = useState<string>("all");

  const filtered = useMemo(() => {
    if (segment === "monthly") return allDecks.filter((d) => d.type === "monthly");
    if (segment === "season") return allDecks.filter((d) => d.type === "season");
    return allDecks;
  }, [allDecks, segment]);

  const featured = filtered.find((d) => d.isCurrent);
  const rest = filtered.filter((d) => d.id !== featured?.id);

  return (
    <PhoneShell>
      <header className="flex flex-col gap-2">
        <Eyebrow>
          <Text id="library.eyebrow" />
        </Eyebrow>
        <DisplayTitle className="text-[38px] leading-[1.06]">
          <Text id="library.title" />
        </DisplayTitle>
        <Text
          id="library.subtitle"
          as="p"
          className="text-[15px] leading-[1.6] text-[color:var(--df-text-secondary)] max-w-[300px]"
        />
      </header>

      <div className="mt-6">
        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: "all", label: <Text id="library.segAll" /> },
            { value: "monthly", label: <Text id="library.segMonthly" /> },
            { value: "season", label: <Text id="library.segSeason" /> },
          ]}
        />
      </div>

      {allDecks.length === 0 ? (
        <div className="mt-16 grid place-items-center gap-4 text-center">
          <LuLibrary className="h-14 w-14 text-[color:var(--df-text-tertiary)]" strokeWidth={1.5} />
          <DisplayTitle className="text-[25px]">
            <Text id="library.emptyTitle" />
          </DisplayTitle>
          <Text
            id="library.emptyBody"
            as="p"
            className="max-w-[280px] text-[15px] leading-[1.6] text-[color:var(--df-text-secondary)]"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 grid place-items-center gap-4 text-center">
          <LuFilter className="h-14 w-14 text-[color:var(--df-text-tertiary)]" strokeWidth={1.5} />
          <DisplayTitle className="text-[25px]">
            <Text
              id={segment === "season" ? "library.emptySeasonTitle" : "library.emptyMonthlyTitle"}
            />
          </DisplayTitle>
          <Text
            id={segment === "season" ? "library.emptySeasonBody" : "library.emptyMonthlyBody"}
            as="p"
            className="max-w-[280px] text-[15px] leading-[1.6] text-[color:var(--df-text-secondary)]"
          />
          <button
            type="button"
            onClick={() => setSegment("all")}
            className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[color:var(--df-lilac)] transition-colors duration-fast hover:text-[color:var(--df-cream)]"
          >
            <Text id="library.showAll" />
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {featured && <DeckTileLink deck={featured} featured />}
          {rest.map((deck) => (
            <DeckTileLink key={deck.id} deck={deck} featured={false} />
          ))}
        </div>
      )}
    </PhoneShell>
  );
}
