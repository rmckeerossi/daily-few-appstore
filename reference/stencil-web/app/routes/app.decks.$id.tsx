import type { Route } from "./+types/app.decks.$id";
import { Link } from "react-router";
import { LuArrowLeft, LuChevronRight, LuLayers } from "react-icons/lu";
import { eq, and, inArray } from "drizzle-orm";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { Text } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/ui/strings";
import { decks, cards, answers } from "~/generated/db-schema";
import { PhoneShell, Eyebrow, DisplayTitle, RoundIconButton } from "~/components/design";
import { cn } from "~/lib/utils";

const ART = {
  brand: "linear-gradient(160deg, #531832 0%, #8A365A 100%)",
  season:
    "radial-gradient(120% 90% at 20% 0%, rgba(209,219,255,.5), rgba(209,219,255,0) 60%), linear-gradient(160deg, #6B2743 0%, #3A1526 100%)",
};

export function meta({ data }: Route.MetaArgs) {
  const name = data?.deck?.name ?? "Deck";
  return [{ title: `${name} · Daily Few` }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  const [deck] = await db
    .select()
    .from(decks)
    .where(eq(decks.id, params.id))
    .limit(1);

  // Decks are shared content — any signed-in user can open one.
  if (!deck) {
    return { deck: null, categories: [] as CategoryRow[] };
  }

  const deckCards = await db
    .select({ id: cards.id, category: cards.category })
    .from(cards)
    .where(eq(cards.deckId, deck.id));

  const cardIds = deckCards.map((c) => c.id);
  const answeredCardIds = new Set<string>();
  if (cardIds.length > 0) {
    const rows = await db
      .select({ cardId: answers.cardId })
      .from(answers)
      .where(and(eq(answers.createdBy, user.id), inArray(answers.cardId, cardIds)));
    for (const r of rows) {
      if (r.cardId) answeredCardIds.add(r.cardId);
    }
  }

  const byCategory = new Map<string, { total: number; answered: number }>();
  for (const c of deckCards) {
    const name = c.category ?? "";
    if (!name) continue;
    const entry = byCategory.get(name) ?? { total: 0, answered: 0 };
    entry.total += 1;
    if (answeredCardIds.has(c.id)) entry.answered += 1;
    byCategory.set(name, entry);
  }

  const categories: CategoryRow[] = [...byCategory.entries()]
    .map(([name, v]) => ({ name, total: v.total, answered: v.answered }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    deck: {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      type: deck.type,
      artStyle: deck.artStyle,
      tag: deck.month ?? deck.season ?? null,
      cardCount: deckCards.length,
    },
    categories,
  };
}

type CategoryRow = { name: string; total: number; answered: number };

export default function DeckDetail({ loaderData }: Route.ComponentProps) {
  const { deck, categories } = loaderData;

  if (!deck) {
    return (
      <PhoneShell>
        <div className="grid place-items-center gap-4 py-24 text-center">
          <span
            className="grid h-16 w-16 place-items-center rounded-full"
            style={{ background: "var(--df-lilac-tint)" }}
          >
            <LuLayers className="h-7 w-7" style={{ color: "var(--df-lilac)" }} />
          </span>
          <DisplayTitle className="text-[30px] leading-[1.1]">
            <Text id="deck.notFoundTitle" />
          </DisplayTitle>
          <p className="max-w-[240px] text-[15px] leading-relaxed" style={{ color: "var(--df-text-secondary)" }}>
            <Text id="deck.notFoundBody" />
          </p>
          <Link
            to="/app/library"
            className="mt-2 font-mono text-[10.5px] uppercase tracking-[.16em]"
            style={{ color: "var(--df-lilac)" }}
          >
            <Text id="deck.notFoundAction" />
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const artStyle = deck.artStyle ?? deck.type ?? "";
  const heroGradient = /season/i.test(artStyle) || deck.type === "season" ? ART.season : ART.brand;
  const typeKey = `deck.type.${deck.type}` as StringKey;

  return (
    <PhoneShell>
      {/* Full-bleed hero */}
      <section
        className="-mx-[22px] -mt-16 px-[22px] pb-9 pt-16"
        style={{ background: heroGradient }}
      >
        <Link to="/app/library" aria-label="Back" className="inline-flex">
          <RoundIconButton icon={<LuArrowLeft className="h-5 w-5" />} />
        </Link>

        <div className="mt-8 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[.16em]" style={{ color: "var(--df-lilac)" }}>
          <Text id={typeKey} />
          {deck.tag && (
            <>
              <span aria-hidden="true">·</span>
              <span>{deck.tag}</span>
            </>
          )}
        </div>

        <DisplayTitle className="mt-4 text-[44px] leading-[1.04]">
          {deck.name}
        </DisplayTitle>

        <p className="mt-4 max-w-[300px] text-[15px] leading-[1.6]" style={{ color: "var(--df-text-secondary)" }}>
          {deck.description || <Text id="deck.descriptionFallback" />}
        </p>

        <p className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em]" style={{ color: "var(--df-text-label)" }}>
          <Text id="deck.metaCards" vars={{ count: deck.cardCount }} />
          <span aria-hidden="true">·</span>
          <Text id="deck.metaCategories" vars={{ count: categories.length }} />
        </p>
      </section>

      {/* Category list */}
      <section className="mt-9">
        <Eyebrow>
          <Text id="deck.categoryEyebrow" />
        </Eyebrow>
        <DisplayTitle className="mt-2 text-[30px] leading-[1.1]">
          <Text id="deck.chooseCategory" />
        </DisplayTitle>
        <p className="mt-1 text-[13px]" style={{ color: "var(--df-text-tertiary)" }}>
          <Text id="deck.chooseCategoryHint" />
        </p>

        {categories.length === 0 ? (
          <div className="mt-8 grid place-items-center gap-3 py-10 text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-full"
              style={{ background: "var(--df-lilac-tint)" }}
            >
              <LuLayers className="h-6 w-6" style={{ color: "var(--df-lilac)" }} />
            </span>
            <DisplayTitle className="text-[23px] leading-[1.1]">
              <Text id="deck.emptyTitle" />
            </DisplayTitle>
            <p className="max-w-[240px] text-[13px] leading-relaxed" style={{ color: "var(--df-text-secondary)" }}>
              <Text id="deck.emptyBody" />
            </p>
            <Link
              to="/app/library"
              className="mt-1 font-mono text-[10.5px] uppercase tracking-[.16em]"
              style={{ color: "var(--df-lilac)" }}
            >
              <Text id="deck.emptyAction" />
            </Link>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {categories.map((cat) => (
              <li key={cat.name}>
                <CategoryRowLink deckId={deck.id} cat={cat} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PhoneShell>
  );
}

function CategoryRowLink({ deckId, cat }: { deckId: string; cat: CategoryRow }) {
  const complete = cat.total > 0 && cat.answered >= cat.total;
  const pct = cat.total > 0 ? Math.min(100, Math.round((cat.answered / cat.total) * 100)) : 0;
  const href = `/app/draw?deck=${encodeURIComponent(deckId)}&category=${encodeURIComponent(cat.name)}`;

  return (
    <Link
      to={href}
      className={cn(
        "group flex items-center gap-4 rounded-[18px] px-[18px] py-5 transition-colors",
      )}
      style={{
        background: "var(--df-surface)",
        border: "1px solid var(--df-surface-border)",
      }}
    >
      <div className="min-w-0 flex-1">
        <DisplayTitle className="truncate text-[23px] font-normal leading-[1.1]">
          {cat.name}
        </DisplayTitle>

        <div className="mt-3 flex items-center gap-3">
          <span
            className="h-[3px] flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--df-divider)" }}
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${pct}%`, background: "var(--df-lilac)" }}
            />
          </span>
          <span
            className="shrink-0 font-mono text-[11px] tracking-[.02em] [font-variant-numeric:tabular-nums]"
            style={{ color: complete ? "var(--df-lilac)" : "var(--df-text-label)" }}
          >
            {complete ? (
              <Text id="deck.allAnswered" />
            ) : (
              <Text id="deck.progress" vars={{ answered: cat.answered, total: cat.total }} />
            )}
          </span>
        </div>
      </div>

      <LuChevronRight
        className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--df-text-tertiary)" }}
      />
    </Link>
  );
}
