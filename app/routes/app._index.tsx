import type { Route } from "./+types/app._index";
import type { ReactNode } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import { eq } from "drizzle-orm";
import {
  LuMoon,
  LuLayers,
  LuPencilLine,
  LuCheck,
  LuArrowRight,
} from "react-icons/lu";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { Text } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/ui/strings";
import { decks, cards, answers, settings } from "~/generated/db-schema";
import {
  Eyebrow,
  DisplayTitle,
  QuestionCard,
  DeckRowCard,
  MonthRing,
  PrimaryButton,
  OutlineButton,
  Toast,
} from "~/components/design";
import { cn } from "~/lib/utils";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function meta({}: Route.MetaArgs) {
  return [{ title: "Daily Few" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  const [deckRows, cardRows, answerRows, settingRows] = await Promise.all([
    db.select().from(decks).where(eq(decks.createdBy, user.id)),
    db.select().from(cards).where(eq(cards.createdBy, user.id)),
    db.select().from(answers).where(eq(answers.createdBy, user.id)),
    db.select().from(settings).where(eq(settings.createdBy, user.id)),
  ]);

  // --- dates, all computed here so render is deterministic ---
  const now = new Date();
  const y = now.getFullYear();
  const mIdx = now.getMonth();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(y, mIdx + 1, 0).getDate();
  const monthKey = `${y}-${String(mIdx + 1).padStart(2, "0")}`;
  const dateLabel = `${WEEKDAYS[now.getDay()]} · ${MONTHS_SHORT[mIdx]} ${dayOfMonth}`;
  const hour = now.getHours();
  const greetingKey =
    hour < 12
      ? "home.greetingMorning"
      : hour < 18
        ? "home.greetingAfternoon"
        : "home.greetingEvening";
  const dayOfYear = Math.floor(
    (Date.UTC(y, mIdx, dayOfMonth) - Date.UTC(y, 0, 0)) / 86400000,
  );
  const daysUntilTurn = daysInMonth - dayOfMonth + 1;
  const monthLabel = MONTHS_LONG[mIdx].toUpperCase();

  // days answered this month (from stored month + ISO day slice, tz-safe)
  const answeredDays = new Set<number>();
  for (const a of answerRows) {
    if (a.month === monthKey && typeof a.createdAt === "string") {
      answeredDays.add(Number(a.createdAt.slice(8, 10)));
    }
  }
  const ringDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return {
      reflected: answeredDays.has(d),
      past: d < dayOfMonth,
      today: d === dayOfMonth,
    };
  });

  // deterministic card of the day
  const deckById = new Map(deckRows.map((d) => [d.id, d]));
  const dayCards = cardRows.filter((c) => c.isCardOfDay);
  const cod = dayCards.length ? dayCards[dayOfYear % dayCards.length] : null;
  const codDeck = cod ? deckById.get(cod.deckId) : null;
  const cardOfDay = cod
    ? {
        id: cod.id,
        question: cod.question,
        deckName: codDeck?.name ?? "",
        categoryName: cod.category ?? "",
      }
    : null;
  const cardOfDayAnsweredToday = cod
    ? answerRows.some(
        (a) =>
          a.cardId === cod.id &&
          a.month === monthKey &&
          typeof a.createdAt === "string" &&
          Number(a.createdAt.slice(8, 10)) === dayOfMonth,
      )
    : false;

  const countCards = (deckId: string) =>
    cardRows.filter((c) => c.deckId === deckId).length;
  const toDeck = (d: (typeof deckRows)[number] | undefined) =>
    d
      ? {
          id: d.id,
          name: d.name,
          description: d.description ?? "",
          artStyle: d.artStyle ?? "monthly",
          cardCount: countCards(d.id),
        }
      : null;

  const monthDeck = toDeck(
    deckRows.find((d) => d.isCurrent) ?? deckRows.find((d) => d.type === "monthly"),
  );
  const seasonRaw = deckRows.find((d) => d.type === "season");
  const seasonDeck = toDeck(seasonRaw);
  const season = settingRows[0]?.season ?? seasonRaw?.season ?? "";

  return {
    name: user.name?.split(" ")[0] ?? "there",
    greetingKey,
    dateLabel,
    monthLabel,
    ringDays,
    daysUntilTurn: String(daysUntilTurn),
    monthKey,
    cardOfDay,
    cardOfDayAnsweredToday,
    monthDeck,
    seasonDeck,
    season,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const form = await request.formData();

  if (form.get("intent") === "reflect") {
    const now = new Date().toISOString();
    await db.insert(answers).values({
      id: crypto.randomUUID(),
      cardId: String(form.get("cardId") ?? ""),
      questionText: String(form.get("questionText") ?? ""),
      deckName: (form.get("deckName") as string) || null,
      categoryName: (form.get("categoryName") as string) || null,
      month: String(form.get("month") ?? ""),
      reflected: true,
      text: "",
      photos: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  }
  return { ok: false };
}

function EmptyBlock({
  icon,
  titleId,
  bodyId,
}: {
  icon: ReactNode;
  titleId: StringKey;
  bodyId: StringKey;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--df-surface-border)] bg-[var(--df-surface)] px-6 py-12 text-center flex flex-col items-center gap-3">
      <div className="text-[var(--df-text-tertiary)]">{icon}</div>
      <DisplayTitle
        as="h3"
        className="text-[23px] leading-[1.1] text-foreground"
      >
        <Text id={titleId} />
      </DisplayTitle>
      <Text
        id={bodyId}
        as="p"
        className="max-w-[240px] font-sans text-[13px] leading-[1.45] text-[var(--df-text-tertiary)]"
      />
    </div>
  );
}

function CardOfDay({
  card,
  answered,
  monthKey,
}: {
  card: NonNullable<Route.ComponentProps["loaderData"]["cardOfDay"]>;
  answered: boolean;
  monthKey: string;
}) {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const reflecting = fetcher.state !== "idle";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <LuMoon size={14} className="text-[var(--df-lilac)]" />
        <Eyebrow>
          <Text id="home.cardEyebrow" />
        </Eyebrow>
      </div>

      <QuestionCard
        question={card.question}
        deckLabel={card.deckName}
        categoryLabel={card.categoryName}
      />

      {answered ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--df-lilac-tint)] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[.16em] text-[var(--df-lilac)]">
              <LuCheck size={14} />
              <Text id="home.answeredPill" />
            </span>
            <Text
              id="home.answeredHelper"
              as="p"
              className="font-sans text-[13px] leading-[1.45] text-[var(--df-text-tertiary)]"
            />
          </div>
          <OutlineButton
            size="md"
            onClick={() => navigate(`/app/answer?card=${card.id}`)}
          >
            <Text id="home.addAnother" />
          </OutlineButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Text
            id="home.cardHelper"
            as="p"
            className="font-sans text-[13px] leading-[1.45] text-[var(--df-text-secondary)]"
          />
          <div className="flex items-center gap-3">
            <PrimaryButton
              size="lg"
              className="flex-1"
              onClick={() => navigate(`/app/answer?card=${card.id}`)}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <LuPencilLine size={16} />
                <Text id="common.answer" />
              </span>
            </PrimaryButton>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="reflect" />
              <input type="hidden" name="cardId" value={card.id} />
              <input type="hidden" name="questionText" value={card.question} />
              <input type="hidden" name="deckName" value={card.deckName} />
              <input type="hidden" name="categoryName" value={card.categoryName} />
              <input type="hidden" name="month" value={monthKey} />
              <OutlineButton size="md" type="submit" disabled={reflecting}>
                <span className="inline-flex items-center justify-center gap-2">
                  <LuCheck size={16} />
                  <Text id="home.reflectedAction" />
                </span>
              </OutlineButton>
            </fetcher.Form>
          </div>
        </div>
      )}

      {fetcher.data?.ok ? (
        <Toast message={<Text id="home.reflectedToast" />} />
      ) : null}
    </section>
  );
}

export default function HomeScreen({ loaderData }: Route.ComponentProps) {
  const {
    name,
    greetingKey,
    dateLabel,
    monthLabel,
    ringDays,
    daysUntilTurn,
    monthKey,
    cardOfDay,
    cardOfDayAnsweredToday,
    monthDeck,
    seasonDeck,
    season,
  } = loaderData;

  return (
    <div className="flex flex-col gap-10">
      {/* header row */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[.16em] text-[var(--df-text-label)]">
            {dateLabel}
          </span>
          <DisplayTitle
            as="h1"
            className="text-[34px] leading-[1.08] font-light text-foreground"
          >
            <Text id={greetingKey as StringKey} vars={{ name }} />
          </DisplayTitle>
        </div>
        <img
          src="/assets/submark-white.png"
          alt="Daily Few"
          width={40}
          height={40}
          className="mt-1 h-9 w-9 shrink-0 opacity-90"
        />
      </header>

      {/* month ring */}
      <section className="flex flex-col items-center gap-4">
        <Eyebrow className="self-start">
          <Text id="home.recapEyebrow" />
        </Eyebrow>
        <MonthRing
          monthLabel={monthLabel}
          centerBig={daysUntilTurn}
          centerSub={<Text id="home.ringCenterSub" />}
          days={ringDays}
        />
      </section>

      {/* card of the day */}
      {cardOfDay ? (
        <CardOfDay
          card={cardOfDay}
          answered={cardOfDayAnsweredToday}
          monthKey={monthKey}
        />
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LuMoon size={14} className="text-[var(--df-lilac)]" />
            <Eyebrow>
              <Text id="home.cardEyebrow" />
            </Eyebrow>
          </div>
          <EmptyBlock
            icon={<LuMoon size={48} />}
            titleId="home.emptyCardTitle"
            bodyId="home.emptyCardBody"
          />
        </section>
      )}

      {/* this month's deck */}
      <section className="flex flex-col gap-4">
        <Eyebrow>
          <Text id="home.monthDeckEyebrow" />
        </Eyebrow>
        {monthDeck ? (
          <Link
            to={`/app/decks/${monthDeck.id}`}
            className={cn("block transition-transform active:translate-y-px")}
          >
            <DeckRowCard
              name={monthDeck.name}
              description={monthDeck.description}
              meta={
                <Text
                  id="home.deckMetaMonthly"
                  vars={{ count: monthDeck.cardCount }}
                />
              }
              artStyle={monthDeck.artStyle}
            />
          </Link>
        ) : (
          <EmptyBlock
            icon={<LuLayers size={48} />}
            titleId="home.emptyDeckTitle"
            bodyId="home.emptyDeckBody"
          />
        )}
      </section>

      {/* season deck */}
      {seasonDeck ? (
        <section className="flex flex-col gap-4">
          <Eyebrow className="inline-flex items-center gap-1.5">
            <Text id="home.seasonDeckEyebrow" />
            {season ? <span className="text-[var(--df-lilac)]">· {season}</span> : null}
          </Eyebrow>
          <Link
            to={`/app/decks/${seasonDeck.id}`}
            className="block transition-transform active:translate-y-px"
          >
            <DeckRowCard
              name={seasonDeck.name}
              description={seasonDeck.description}
              meta={
                <span className="inline-flex items-center gap-1.5">
                  <Text
                    id="home.deckMetaSeason"
                    vars={{ count: seasonDeck.cardCount }}
                  />
                  <LuArrowRight size={12} />
                </span>
              }
              artStyle={seasonDeck.artStyle}
            />
          </Link>
        </section>
      ) : null}
    </div>
  );
}
