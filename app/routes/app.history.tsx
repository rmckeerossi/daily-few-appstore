import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";
import {
  LuPenLine,
  LuImage,
  LuCheck,
  LuChevronRight,
  LuArrowRight,
  LuPencil,
  LuTrash2,
  LuInbox,
} from "react-icons/lu";
import { eq, desc, and } from "drizzle-orm";
import type { Route } from "./+types/app.history";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { answers, monthlyNotes } from "~/generated/db-schema";
import { Text } from "~stencil/ui/strings";
import {
  PhoneShell,
  Eyebrow,
  DisplayTitle,
  SegmentedControl,
  PrimaryButton,
  Toast,
} from "~/components/design";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type AnswerRow = {
  id: string;
  cardId: string;
  question: string;
  deckName: string;
  categoryName: string;
  text: string;
  reflected: boolean;
  hasText: boolean;
  hasPhotos: boolean;
  photos: string[];
  monthAbbr: string;
  day: string;
  detailDate: string;
};

type MonthGroup = {
  monthKey: string;
  monthName: string;
  fullLabel: string;
  count: number;
  isCurrent: boolean;
  note: string;
  rows: AnswerRow[];
};

type CardGroup = {
  cardId: string;
  question: string;
  count: number;
  lastDate: string;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const tz = context.viewerTimeZone;

  const rows = await db
    .select()
    .from(answers)
    .where(eq(answers.createdBy, user.id))
    .orderBy(desc(answers.createdAt));

  const notes = await db
    .select()
    .from(monthlyNotes)
    .where(eq(monthlyNotes.createdBy, user.id));

  const noteByMonth = new Map<string, string>();
  for (const n of notes) noteByMonth.set(n.month, (n.text ?? "").toString());

  const ymFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const currentMonthKey = ymFmt.format(new Date()).slice(0, 7);

  const abbrFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" });
  const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" });

  const built: AnswerRow[] = rows.map((r) => {
    const created = new Date(r.createdAt);
    const photos = Array.isArray(r.photos) ? (r.photos as string[]) : [];
    const text = (r.text ?? "").toString();
    return {
      id: r.id,
      cardId: r.cardId,
      question: r.questionText,
      deckName: (r.deckName ?? "").toString(),
      categoryName: (r.categoryName ?? "").toString(),
      text,
      reflected: !!r.reflected,
      hasText: text.trim().length > 0,
      hasPhotos: photos.length > 0,
      photos,
      monthAbbr: abbrFmt.format(created).toUpperCase(),
      day: dayFmt.format(created),
      detailDate: `${abbrFmt.format(created)} ${dayFmt.format(created)}`,
    };
  });

  // Group by month (descending — rows are already newest-first)
  const monthOrder: string[] = [];
  const monthMap = new Map<string, AnswerRow[]>();
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i].month;
    if (!monthMap.has(key)) {
      monthMap.set(key, []);
      monthOrder.push(key);
    }
    monthMap.get(key)!.push(built[i]);
  }

  const monthGroups: MonthGroup[] = monthOrder.map((key) => {
    const [yStr, mStr] = key.split("-");
    const mIdx = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1));
    const name = MONTH_NAMES[mIdx];
    return {
      monthKey: key,
      monthName: name,
      fullLabel: `${name} ${yStr}`,
      count: monthMap.get(key)!.length,
      isCurrent: key === currentMonthKey,
      note: noteByMonth.get(key) ?? "",
      rows: monthMap.get(key)!,
    };
  });

  // Group by card (descending by most recent answer)
  const cardOrder: string[] = [];
  const cardMap = new Map<string, AnswerRow[]>();
  for (const r of built) {
    if (!cardMap.has(r.cardId)) {
      cardMap.set(r.cardId, []);
      cardOrder.push(r.cardId);
    }
    cardMap.get(r.cardId)!.push(r);
  }
  const cardGroups: CardGroup[] = cardOrder.map((id) => {
    const list = cardMap.get(id)!;
    return {
      cardId: id,
      question: list[0].question,
      count: list.length,
      lastDate: list[0].detailDate,
    };
  });

  return { monthGroups, cardGroups, currentMonthKey };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const form = await request.formData();
  const intent = form.get("intent");
  const now = new Date().toISOString();

  if (intent === "deleteAnswer") {
    const id = String(form.get("answerId") ?? "");
    if (id) {
      await db
        .delete(answers)
        .where(and(eq(answers.id, id), eq(answers.createdBy, user.id)));
    }
    return { ok: true as const, toast: "deleted" as const };
  }

  if (intent === "saveNote") {
    const month = String(form.get("month") ?? "");
    const text = String(form.get("text") ?? "");
    if (month) {
      const existing = await db
        .select()
        .from(monthlyNotes)
        .where(eq(monthlyNotes.month, month));
      const mine = existing.find((n) => n.createdBy === user.id);
      if (mine) {
        await db
          .update(monthlyNotes)
          .set({ text, updatedAt: now })
          .where(eq(monthlyNotes.id, mine.id));
      } else {
        await db.insert(monthlyNotes).values({
          id: crypto.randomUUID(),
          month,
          text,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    return { ok: true as const, toast: "noteSaved" as const };
  }

  return { ok: false as const };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "History · Daily Few" }];
}

const LILAC = "var(--df-lilac)";

function FormatIcons({ row }: { row: AnswerRow }) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true" style={{ color: LILAC }}>
      {row.hasText && <LuPenLine size={14} />}
      {row.hasPhotos && <LuImage size={14} />}
      {row.reflected && <LuCheck size={14} />}
    </div>
  );
}

function AnswerRowItem({
  row,
  onOpen,
}: {
  row: AnswerRow;
  onOpen: (row: AnswerRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-colors"
      style={{
        background: "var(--df-surface)",
        borderColor: "var(--df-surface-border)",
      }}
    >
      <div className="flex w-11 flex-shrink-0 flex-col items-center pt-1">
        <span className="font-mono text-[10px] tracking-[.14em]" style={{ color: "var(--df-text-label)" }}>
          {row.monthAbbr}
        </span>
        <DisplayTitle className="text-[24px] leading-none">
          {row.day}
        </DisplayTitle>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[19px] font-light leading-[1.2]" style={{ color: "var(--foreground)" }}>
          {row.question}
        </p>
        {row.hasText && (
          <p
            className="mt-1 overflow-hidden text-[13px] leading-[1.45]"
            style={{
              color: "var(--df-text-secondary)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {row.text}
          </p>
        )}
        <div className="mt-2">
          <FormatIcons row={row} />
        </div>
      </div>
    </button>
  );
}

function MonthNoteCard({
  group,
  onEdit,
}: {
  group: MonthGroup;
  onEdit: (group: MonthGroup) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(group)}
      className="flex w-full flex-col gap-2 rounded-2xl border px-5 py-4 text-left transition-colors"
      style={{
        background: "var(--df-lilac-tint)",
        borderColor: "rgba(209,219,255,.28)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[10px] uppercase tracking-[.16em]"
          style={{ color: LILAC }}
        >
          <Text id="history.note.eyebrow" vars={{ month: group.monthName }} />
        </span>
        <LuPencil size={15} style={{ color: LILAC }} />
      </div>
      {group.note ? (
        <p className="text-[15px] leading-[1.6]" style={{ color: "var(--df-text-secondary)" }}>
          {group.note}
        </p>
      ) : (
        <Text
          id="history.note.empty"
          as="p"
          className="text-[15px] leading-[1.6]"
          style={{ color: "var(--df-text-tertiary)" }}
        />
      )}
    </button>
  );
}

function RecapCard({ group }: { group: MonthGroup }) {
  return (
    <Link
      to={`#month-${group.monthKey}`}
      className="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border px-5 py-5"
      style={{
        border: "1px solid rgba(209,219,255,.22)",
        background:
          "radial-gradient(120% 90% at 100% 0%, rgba(209,219,255,.28), rgba(209,219,255,0) 55%), linear-gradient(160deg, #531832 0%, #3A1526 100%)",
      }}
    >
      <div className="min-w-0">
        <span
          className="font-mono text-[10px] uppercase tracking-[.16em]"
          style={{ color: LILAC }}
        >
          <Text id="history.recap.eyebrow" />
        </span>
        <DisplayTitle className="mt-1 text-[24px] leading-[1.1]">
          <Text id="history.recap.title" vars={{ month: group.monthName }} />
        </DisplayTitle>
      </div>
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: "var(--df-outline-border)", color: LILAC }}
      >
        <LuArrowRight size={18} />
      </span>
    </Link>
  );
}

function CardGroupRow({ group }: { group: CardGroup }) {
  return (
    <Link
      to="/app/library"
      className="flex items-center gap-4 rounded-2xl border px-4 py-4 transition-colors"
      style={{
        background: "var(--df-surface)",
        borderColor: "var(--df-surface-border)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-[20px] font-light leading-[1.15]" style={{ color: "var(--foreground)" }}>
          {group.question}
        </p>
        <span
          className="mt-1.5 block font-mono text-[10px] uppercase tracking-[.14em]"
          style={{ color: LILAC }}
        >
          <Text
            id="history.card.answers"
            vars={{ count: group.count, date: group.lastDate }}
          />
        </span>
      </div>
      <LuChevronRight size={18} className="flex-shrink-0" style={{ color: "var(--df-text-tertiary)" }} />
    </Link>
  );
}

function EmptyHistory() {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border px-6 py-14 text-center"
      style={{ background: "var(--df-surface)", borderColor: "var(--df-surface-border)" }}>
      <LuInbox size={52} style={{ color: "var(--df-text-tertiary)" }} />
      <DisplayTitle className="text-[24px]">
        <Text id="history.empty.title" />
      </DisplayTitle>
      <Text
        id="history.empty.body"
        as="p"
        className="max-w-[260px] text-[14px] leading-[1.6]"
        style={{ color: "var(--df-text-secondary)" }}
      />
      <Link to="/app/draw" className="mt-1">
        <PrimaryButton size="md"><Text id="history.empty.cta" /></PrimaryButton>
      </Link>
    </div>
  );
}

export default function History({ loaderData }: Route.ComponentProps) {
  const { monthGroups, cardGroups } = loaderData;
  const [tab, setTab] = useState<"month" | "card">("month");
  const [detail, setDetail] = useState<AnswerRow | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [noteGroup, setNoteGroup] = useState<MonthGroup | null>(null);
  const [toast, setToast] = useState<"deleted" | "noteSaved" | null>(null);

  const deleteFetcher = useFetcher<typeof action>();
  const noteFetcher = useFetcher<typeof action>();

  const isEmpty = monthGroups.length === 0;

  const rowById = useMemo(() => {
    const m = new Map<string, AnswerRow>();
    for (const g of monthGroups) for (const r of g.rows) m.set(r.id, r);
    return m;
  }, [monthGroups]);

  // Close detail + toast once a delete resolves
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.ok) {
      setDetail(null);
      setConfirming(false);
      setToast("deleted");
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  useEffect(() => {
    if (noteFetcher.state === "idle" && noteFetcher.data?.ok) {
      setNoteGroup(null);
      setToast("noteSaved");
    }
  }, [noteFetcher.state, noteFetcher.data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const deleting = deleteFetcher.state !== "idle";
  const savingNote = noteFetcher.state !== "idle";

  const options = [
    { value: "month", label: <Text id="history.tab.month" /> },
    { value: "card", label: <Text id="history.tab.card" /> },
  ];

  return (
    <PhoneShell>
      {toast && (
        <Toast message={<Text id={toast === "deleted" ? "history.toast.deleted" : "history.toast.noteSaved"} />} />
      )}

      <header className="mb-6">
        <Eyebrow><Text id="history.eyebrow" /></Eyebrow>
        <DisplayTitle as="h1" className="mt-2 text-[38px] leading-[1.06]">
          <Text id="history.title" />
        </DisplayTitle>
      </header>

      <div className="mb-7">
        <SegmentedControl
          options={options}
          value={tab}
          onChange={(v: string) => setTab(v as "month" | "card")}
        />
      </div>

      {isEmpty ? (
        <EmptyHistory />
      ) : tab === "month" ? (
        <div className="flex flex-col gap-10">
          {monthGroups.map((group) => (
            <section key={group.monthKey} id={`month-${group.monthKey}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <DisplayTitle className="text-[26px] leading-[1.1]">
                  {group.monthName}
                </DisplayTitle>
                <span className="font-mono text-[11px] tracking-[.06em]" style={{ color: LILAC }}>
                  <Text id="history.answered" vars={{ count: group.count }} />
                </span>
              </div>

              <div className="mb-4">
                {group.isCurrent ? (
                  <MonthNoteCard group={group} onEdit={setNoteGroup} />
                ) : (
                  <RecapCard group={group} />
                )}
              </div>

              <div className="flex flex-col gap-3">
                {group.rows.map((row) => (
                  <AnswerRowItem key={row.id} row={row} onOpen={setDetail} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cardGroups.map((group) => (
            <CardGroupRow key={group.cardId} group={group} />
          ))}
        </div>
      )}

      {/* Answer detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setConfirming(false); } }}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="mx-auto max-w-[430px] gap-0 rounded-t-[28px] border-0 p-0"
          style={{ background: "var(--df-cream)" }}
        >
          {detail && (
            <>
              <div className="px-6 pt-6">
                <SheetDescription
                  className="font-mono text-[11px] uppercase tracking-[.14em]"
                  style={{ color: "var(--df-burgundy-500)" }}
                >
                  {detail.detailDate}
                  {detail.deckName ? ` · ${detail.deckName}` : ""}
                </SheetDescription>
                <SheetTitle
                  className="mt-2 font-display text-[28px] font-light leading-[1.12]"
                  style={{ color: "var(--df-burgundy)" }}
                >
                  {detail.question}
                </SheetTitle>
              </div>
              <SheetBody className="gap-4">
                {detail.hasText ? (
                  <p className="whitespace-pre-wrap text-[16px] leading-[1.7]" style={{ color: "var(--df-burgundy-700)" }}>
                    {detail.text}
                  </p>
                ) : (
                  <Text
                    id="common.privateNote"
                    as="p"
                    className="text-[14px] italic"
                    style={{ color: "var(--df-burgundy-600)" }}
                  />
                )}

                {detail.hasPhotos && (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.photos.map((p, i) => (
                      <img
                        key={i}
                        src={`/api/files/${p}?width=400&height=400&fit=cover`}
                        alt="Reflection photo"
                        width={200}
                        height={200}
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </SheetBody>
              <SheetFooter className="gap-3" style={{ borderColor: "rgba(76,28,49,.14)" }}>
                {confirming ? (
                  <div className="flex flex-col gap-3">
                    <Text
                      id="history.detail.confirm"
                      as="p"
                      className="font-display text-[20px]"
                      style={{ color: "var(--df-burgundy)" }}
                    />
                    <Text
                      id="history.detail.confirmBody"
                      as="p"
                      className="text-[13px]"
                      style={{ color: "var(--df-burgundy-600)" }}
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="h-11 flex-1 rounded-full border text-[13px] font-medium"
                        style={{ borderColor: "var(--df-burgundy)", color: "var(--df-burgundy)" }}
                      >
                        <Text id="history.detail.confirmNo" />
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() =>
                          deleteFetcher.submit(
                            { intent: "deleteAnswer", answerId: detail.id },
                            { method: "post" },
                          )
                        }
                        className="h-11 flex-1 rounded-full text-[13px] font-medium text-[#FEFCF2] disabled:opacity-60"
                        style={{ background: "#9B2C2C" }}
                      >
                        <Text id="history.detail.confirmYes" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Link
                      to={`/app/answer?answer=${detail.id}`}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-medium text-[#FEFCF2]"
                      style={{ background: "var(--df-burgundy)" }}
                    >
                      <LuPencil size={15} />
                      <Text id="history.detail.edit" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border text-[13px] font-medium"
                      style={{ borderColor: "#9B2C2C", color: "#9B2C2C" }}
                    >
                      <LuTrash2 size={15} />
                      <Text id="history.detail.delete" />
                    </button>
                  </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Monthly note editor sheet */}
      <Sheet open={!!noteGroup} onOpenChange={(o) => { if (!o) setNoteGroup(null); }}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="mx-auto max-w-[430px] gap-0 rounded-t-[28px] border-0 p-0"
          style={{ background: "var(--df-cream)" }}
        >
          {noteGroup && (
            <noteFetcher.Form method="post" className="flex flex-col">
              <input type="hidden" name="intent" value="saveNote" />
              <input type="hidden" name="month" value={noteGroup.monthKey} />
              <div className="px-6 pt-6">
                <SheetTitle
                  className="font-display text-[30px] font-light leading-[1.1]"
                  style={{ color: "var(--df-burgundy)" }}
                >
                  <Text id="history.note.eyebrow" vars={{ month: noteGroup.monthName }} />
                </SheetTitle>
              </div>
              <SheetBody>
                <div className="grid gap-2">
                  <Label htmlFor="note-text" style={{ color: "var(--df-burgundy-700)" }}>
                    <Text id="history.noteSheet.label" />
                  </Label>
                  <Textarea
                    id="note-text"
                    name="text"
                    rows={6}
                    defaultValue={noteGroup.note}
                    placeholder=""
                    className="min-h-[140px] resize-none text-[15px]"
                    style={{
                      background: "rgba(76,28,49,.05)",
                      borderColor: "rgba(76,28,49,.18)",
                      color: "var(--df-burgundy)",
                    }}
                  />
                  <Text
                    id="history.noteSheet.placeholder"
                    as="p"
                    className="text-[12px]"
                    style={{ color: "var(--df-burgundy-600)" }}
                  />
                </div>
              </SheetBody>
              <SheetFooter style={{ borderColor: "rgba(76,28,49,.14)" }}>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="h-12 rounded-full text-[13px] font-medium uppercase tracking-[.04em] text-[#FEFCF2] disabled:opacity-60"
                  style={{ background: "var(--df-burgundy)" }}
                >
                  <Text id="history.noteSheet.save" />
                </button>
              </SheetFooter>
            </noteFetcher.Form>
          )}
        </SheetContent>
      </Sheet>
    </PhoneShell>
  );
}
