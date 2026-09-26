import { useEffect, useState } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import {
  LuArrowLeft,
  LuArrowRight,
  LuChevronDown,
  LuCheck,
  LuInbox,
  LuRotateCw,
  LuSend,
} from "react-icons/lu";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Route } from "./+types/app.draw";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { Text } from "~stencil/ui/strings";
import { cards, decks, answers } from "~/generated/db-schema";
import {
  PhoneShell,
  QuestionCard,
  PrimaryButton,
  OutlineButton,
  RoundIconButton,
} from "~/components/design";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";

const CARD_BACK_1 = "linear-gradient(160deg, #3A1526, #6B2743)";
const CARD_BACK_2 = "linear-gradient(160deg, #4C1C31, #6B2743)";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  const url = new URL(request.url);
  const deckId = url.searchParams.get("deck") ?? "";
  const category = url.searchParams.get("category") ?? "";

  const [deck] = deckId
    ? await db
        .select({ id: decks.id, name: decks.name })
        .from(decks)
        .where(and(eq(decks.id, deckId), eq(decks.createdBy, user.id)))
        .limit(1)
    : [];

  // Every card in this deck (for the switch-category sheet).
  const deckCards = deckId
    ? await db
        .select({ id: cards.id, category: cards.category, question: cards.question })
        .from(cards)
        .where(and(eq(cards.deckId, deckId), eq(cards.createdBy, user.id)))
    : [];

  const categoryCounts = new Map<string, number>();
  for (const c of deckCards) {
    const key = c.category ?? "";
    if (!key) continue;
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }
  const categories = Array.from(categoryCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const categoryCards = deckCards.filter((c) => (c.category ?? "") === category);
  const cardIds = categoryCards.map((c) => c.id);

  const answerRows = cardIds.length
    ? await db
        .select({
          cardId: answers.cardId,
          text: answers.text,
          reflected: answers.reflected,
          createdAt: answers.createdAt,
        })
        .from(answers)
        .where(
          and(eq(answers.createdBy, user.id), inArray(answers.cardId, cardIds)),
        )
        .orderBy(desc(answers.createdAt))
    : [];

  const answersByCard: Record<
    string,
    { date: string; preview: string; reflected: boolean }[]
  > = {};
  const answeredIds = new Set<string>();
  for (const row of answerRows) {
    answeredIds.add(row.cardId);
    (answersByCard[row.cardId] ??= []).push({
      date: formatDate(row.createdAt),
      preview: (row.text ?? "").trim(),
      reflected: !!row.reflected,
    });
  }

  const unanswered = categoryCards.filter((c) => !answeredIds.has(c.id));
  const wasReset = categoryCards.length > 0 && unanswered.length === 0;
  const pool = shuffle(wasReset ? categoryCards : unanswered).map((c) => ({
    id: c.id,
    question: c.question,
  }));

  return {
    deckName: deck?.name ?? "",
    deckId,
    category,
    pool,
    answersByCard,
    categories,
    wasReset,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent !== "reflect") {
    return { ok: false as const, error: "Unknown action." };
  }

  const cardId = String(form.get("cardId") ?? "");
  if (!cardId) return { ok: false as const, error: "No card to reflect on." };

  const [card] = await db
    .select({ id: cards.id, question: cards.question, category: cards.category, deckId: cards.deckId })
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.createdBy, user.id)))
    .limit(1);
  if (!card) return { ok: false as const, error: "That card no longer exists." };

  const [deck] = await db
    .select({ name: decks.name })
    .from(decks)
    .where(eq(decks.id, card.deckId))
    .limit(1);

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  try {
    await db.insert(answers).values({
      id: crypto.randomUUID(),
      cardId: card.id,
      questionText: card.question,
      deckName: deck?.name ?? null,
      categoryName: card.category ?? null,
      text: "",
      photos: null,
      reflected: true,
      month,
      createdBy: user.id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Couldn't save just now. Try again." };
  }
}

export default function DrawScreen({ loaderData }: Route.ComponentProps) {
  const { deckName, deckId, category, pool, answersByCard, categories, wasReset } =
    loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();

  const [index, setIndex] = useState(0);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const reflecting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) setPanelOpen(true);
  }, [fetcher.state, fetcher.data]);

  const hasCards = pool.length > 0;
  const safeIndex = hasCards ? index % pool.length : 0;
  const current = hasCards ? pool[safeIndex] : null;
  const pastAnswers = current ? answersByCard[current.id] ?? [] : [];

  function drawAnother() {
    setPanelOpen(false);
    setIndex((i) => (pool.length ? (i + 1) % pool.length : 0));
  }

  const deckLabel = deckName || category;

  return (
    <PhoneShell>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <RoundIconButton
          icon={<LuArrowLeft size={18} />}
          size={40}
          onClick={() => navigate(deckId ? `/app/decks/${deckId}` : "/app/library")}
          aria-label="Back"
        />
        <button
          type="button"
          onClick={() => setSwitchOpen(true)}
          className="flex flex-col items-center gap-0.5 min-w-0"
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[color:var(--df-text-label)] truncate max-w-[220px]">
            {deckLabel}
          </span>
          <span className="flex items-center gap-1 text-[15px] font-[family-name:var(--font-sans)] text-[color:var(--df-text-secondary)]">
            {category}
            <LuChevronDown size={15} className="opacity-70" />
          </span>
        </button>
        <span className="w-10" aria-hidden="true" />
      </div>

      {!hasCards ? (
        <div className="mt-24 flex flex-col items-center text-center gap-4 px-6">
          <LuInbox size={52} className="text-[color:var(--df-text-tertiary)]" />
          <Text
            id="draw.emptyTitle"
            as="h2"
            className="font-[family-name:var(--font-display)] font-light text-[28px] leading-tight"
          />
          <Text
            id="draw.emptyBody"
            as="p"
            className="text-[15px] leading-relaxed text-[color:var(--df-text-secondary)] max-w-[260px]"
          />
          <OutlineButton size="md" onClick={() => setSwitchOpen(true)} className="mt-2">
            <Text id="draw.switchCategory" />
          </OutlineButton>
        </div>
      ) : (
        <>
          {wasReset && (
            <Text
              id="draw.allAnsweredNote"
              as="p"
              className="mt-6 text-center text-[13px] leading-relaxed text-[color:var(--df-text-tertiary)]"
            />
          )}

          {/* Card stage */}
          <div className="relative mt-6 h-[392px]">
            <div
              className="absolute left-1/2 top-4 h-[340px] w-[86%] -translate-x-1/2 rounded-[24px] border border-white/10"
              style={{ background: CARD_BACK_1, transform: "translateX(-50%) rotate(-5deg)" }}
              aria-hidden="true"
            />
            <div
              className="absolute left-1/2 top-4 h-[340px] w-[88%] -translate-x-1/2 rounded-[24px] border border-white/10"
              style={{ background: CARD_BACK_2, transform: "translateX(-50%) rotate(4deg)" }}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 top-4">
              <QuestionCard
                question={current!.question}
                deckLabel={deckName}
                categoryLabel={category}
                height={340}
              />
            </div>
          </div>

          {/* Round actions */}
          <div className="mt-6 flex items-start justify-center gap-9">
            <RoundIconButton
              icon={<LuRotateCw size={20} />}
              label={<Text id="draw.skip" />}
              onClick={drawAnother}
            />
            <RoundIconButton
              icon={<LuCheck size={20} />}
              label={<Text id={reflecting ? "draw.reflecting" : "draw.reflected"} />}
              onClick={() =>
                fetcher.submit(
                  { intent: "reflect", cardId: current!.id },
                  { method: "post" },
                )
              }
            />
            <RoundIconButton
              icon={<LuSend size={20} />}
              label={<Text id="draw.share" />}
              onClick={() => setShareOpen(true)}
            />
          </div>

          {/* Primary answer */}
          <div className="mt-8">
            <PrimaryButton
              size="lg"
              className="w-full"
              onClick={() => navigate(`/app/answer?card=${current!.id}`)}
            >
              <Text id="common.answer" />
            </PrimaryButton>
          </div>

          {/* Reflected confirmation panel */}
          {panelOpen && (
            <div
              className="mt-8 rounded-[20px] p-6 text-center"
              style={{ background: "var(--df-lilac-tint)" }}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--df-lilac)] text-[color:var(--df-burgundy)]">
                <LuCheck size={22} />
              </div>
              <Text
                id="draw.doneTitle"
                as="p"
                className="mt-4 font-[family-name:var(--font-display)] font-light text-[24px]"
              />
              <Text
                id="draw.doneBody"
                as="p"
                className="mt-1 text-[13px] text-[color:var(--df-text-secondary)]"
              />
              <div className="mt-5 flex flex-col gap-2.5">
                <OutlineButton size="md" onClick={drawAnother} className="w-full">
                  <Text id="draw.drawAnother" />
                </OutlineButton>
                <OutlineButton
                  size="md"
                  onClick={() => {
                    setPanelOpen(false);
                    setSwitchOpen(true);
                  }}
                  className="w-full"
                >
                  <Text id="draw.switchCategory" />
                </OutlineButton>
                <OutlineButton size="md" onClick={() => navigate("/app")} className="w-full">
                  <Text id="draw.home" />
                </OutlineButton>
              </div>
            </div>
          )}

          {/* Past answers */}
          <div className="mt-10">
            {pastAnswers.length === 0 ? (
              <Text
                id="draw.pastNone"
                as="p"
                className="text-[13px] text-[color:var(--df-text-tertiary)]"
              />
            ) : pastAnswers.length === 1 ? (
              <Text
                id="draw.pastOnce"
                as="p"
                className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[color:var(--df-text-label)]"
              />
            ) : (
              <Text
                id="draw.pastCount"
                vars={{ count: pastAnswers.length }}
                as="p"
                className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[color:var(--df-text-label)]"
              />
            )}

            {pastAnswers.length > 0 && (
              <ul className="mt-3 flex flex-col">
                {pastAnswers.map((a, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex gap-3 py-3",
                      i < pastAnswers.length - 1 &&
                        "border-b border-[color:var(--df-divider)]",
                    )}
                  >
                    <span className="font-mono text-[11px] tracking-[.02em] text-[color:var(--df-text-tertiary)] min-w-[92px] flex-shrink-0 pt-px">
                      {a.date}
                    </span>
                    {a.preview ? (
                      <span className="text-[13px] leading-snug text-[color:var(--df-text-secondary)] line-clamp-2">
                        {a.preview}
                      </span>
                    ) : (
                      <Text
                        id="draw.reflectedPreview"
                        as="span"
                        className="text-[13px] italic text-[color:var(--df-text-tertiary)]"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Switch category sheet */}
      <Sheet open={switchOpen} onOpenChange={setSwitchOpen}>
        <SheetContent
          side="bottom"
          className="bg-[color:var(--df-cream)] text-[color:var(--df-burgundy)] rounded-t-[28px] border-0"
        >
          <SheetHeader className="border-0">
            <SheetTitle asChild>
              <Text
                id="draw.switchTitle"
                as="h2"
                className="font-[family-name:var(--font-display)] font-light text-[30px] text-[color:var(--df-burgundy)]"
              />
            </SheetTitle>
            <SheetDescription asChild>
              <Text
                id="draw.switchDesc"
                as="p"
                className="text-[14px] text-[color:var(--df-burgundy-600)]"
              />
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="pb-10">
            {categories.map((c) => {
              const active = c.name === category;
              return (
                <Link
                  key={c.name}
                  to={`/app/draw?deck=${encodeURIComponent(deckId)}&category=${encodeURIComponent(c.name)}`}
                  onClick={() => setSwitchOpen(false)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[16px] border px-4 py-4 transition-colors",
                    active
                      ? "border-[color:var(--df-burgundy)] bg-[color:var(--df-burgundy)]/[.06]"
                      : "border-[color:var(--df-burgundy)]/20 hover:bg-[color:var(--df-burgundy)]/[.04]",
                  )}
                >
                  <span className="font-[family-name:var(--font-display)] text-[23px] font-normal text-[color:var(--df-burgundy)]">
                    {c.name}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[11px] text-[color:var(--df-burgundy-600)]">
                    {c.count}
                    <LuArrowRight size={15} />
                  </span>
                </Link>
              );
            })}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Share preview sheet */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent
          side="bottom"
          className="bg-[color:var(--df-cream)] text-[color:var(--df-burgundy)] rounded-t-[28px] border-0"
        >
          <SheetHeader className="border-0">
            <SheetTitle asChild>
              <Text
                id="draw.shareTitle"
                as="h2"
                className="font-[family-name:var(--font-display)] font-light text-[30px] text-[color:var(--df-burgundy)]"
              />
            </SheetTitle>
            <SheetDescription asChild>
              <Text
                id="draw.shareDesc"
                as="p"
                className="text-[14px] text-[color:var(--df-burgundy-600)]"
              />
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="pb-10">
            <div
              className="rounded-[20px] p-6"
              style={{
                background:
                  "radial-gradient(120% 70% at 50% 115%, rgba(209,219,255,.55), rgba(209,219,255,0) 62%), linear-gradient(160deg, #531832 0%, #8A365A 100%)",
              }}
            >
              <p className="font-[family-name:var(--font-display)] font-light text-[28px] leading-[1.12] text-[color:var(--df-cream)] [text-wrap:balance]">
                {current?.question}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Text
                id="draw.shareLinkLabel"
                as="span"
                className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[color:var(--df-burgundy-600)]"
              />
              <div className="rounded-[8px] border border-[color:var(--df-burgundy)]/20 bg-[color:var(--df-burgundy)]/[.04] px-3 py-3 font-mono text-[12px] text-[color:var(--df-burgundy-700)] break-all">
                dailyfew.app/q/{current?.id}
              </div>
            </div>
            <Text
              id="draw.shareNote"
              as="p"
              className="text-[13px] leading-relaxed text-[color:var(--df-burgundy-600)]"
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </PhoneShell>
  );
}
