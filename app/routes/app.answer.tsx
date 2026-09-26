import { useEffect, useMemo, useRef, useState } from "react";
import { redirect, useFetcher, useNavigate } from "react-router";
import { LuX, LuPlus, LuLock } from "react-icons/lu";
import type { Route } from "./+types/app.answer";
import { requireAuth } from "~stencil/auth/server";
import { createDb } from "~stencil/db";
import { createStorage } from "~stencil/storage";
import { Text } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/ui/strings";
import { answers, cards, decks } from "~/generated/db-schema";
import { and, eq } from "drizzle-orm";
import { PhoneShell, QuestionCard, PrimaryButton } from "~/components/design";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 3;

function normalizePhotos(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      return [];
    }
  }
  return [];
}

export function meta() {
  return [{ title: "New answer · Daily Few" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const url = new URL(request.url);
  const answerId = url.searchParams.get("answer");
  const cardId = url.searchParams.get("card");

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  if (answerId) {
    const [row] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.id, answerId), eq(answers.createdBy, user.id)))
      .limit(1);
    if (!row) throw redirect("/app/history");
    return {
      mode: "edit" as const,
      answerId: row.id,
      cardId: row.cardId,
      question: row.questionText,
      deckName: row.deckName,
      categoryName: row.categoryName,
      text: row.text ?? "",
      photos: normalizePhotos(row.photos),
      month: row.month,
    };
  }

  if (cardId) {
    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.createdBy, user.id)))
      .limit(1);
    if (!card) throw redirect("/app");
    const [deck] = await db
      .select()
      .from(decks)
      .where(eq(decks.id, card.deckId))
      .limit(1);
    return {
      mode: "new" as const,
      answerId: null,
      cardId: card.id,
      question: card.question,
      deckName: deck?.name ?? null,
      categoryName: card.category,
      text: "",
      photos: [] as string[],
      month,
    };
  }

  throw redirect("/app");
}

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const form = await request.formData();

  if (String(form.get("intent")) !== "save") {
    return { ok: false as const };
  }

  const cardId = String(form.get("cardId") ?? "");
  const answerId = form.get("answerId") ? String(form.get("answerId")) : null;
  const text = String(form.get("text") ?? "").trim();
  const questionText = String(form.get("questionText") ?? "");
  const deckName = form.get("deckName") ? String(form.get("deckName")) : null;
  const categoryName = form.get("categoryName") ? String(form.get("categoryName")) : null;
  const month = String(form.get("month") ?? "");

  const keptPhotos = form.getAll("keptPhotos").map(String).filter(Boolean);
  const newFiles = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const storage = createStorage(context.cloudflare.env);
  const photoKeys = [...keptPhotos];

  for (const file of newFiles) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      return { ok: false as const };
    }
    if (photoKeys.length >= MAX_PHOTOS) break;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "photo";
    const key = `answers/${user.id}/${crypto.randomUUID()}-${safe}`;
    await storage.put(key, file, { httpMetadata: { contentType: file.type } });
    photoKeys.push(key);
  }

  if (!text && photoKeys.length === 0) {
    return { ok: false as const };
  }

  const nowIso = new Date().toISOString();

  if (answerId) {
    await db
      .update(answers)
      .set({ text, photos: photoKeys, updatedAt: nowIso })
      .where(and(eq(answers.id, answerId), eq(answers.createdBy, user.id)));
  } else {
    await db.insert(answers).values({
      id: crypto.randomUUID(),
      cardId,
      categoryName,
      deckName,
      questionText,
      month,
      text,
      photos: photoKeys,
      reflected: false,
      createdBy: user.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return redirect("/app/history");
}

export default function AnswerScreen({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState(loaderData.text);
  const [keptPhotos, setKeptPhotos] = useState<string[]>(loaderData.photos);
  const [files, setFiles] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<StringKey | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const saving = fetcher.state !== "idle";
  const saveFailed = fetcher.data?.ok === false;

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const photoCount = keptPhotos.length + files.length;
  const canSave = text.trim().length > 0 || photoCount > 0;

  const dirty =
    text !== loaderData.text ||
    files.length > 0 ||
    keptPhotos.length !== loaderData.photos.length;

  function handleClose() {
    if (dirty) {
      setDiscardOpen(true);
    } else {
      navigate(-1);
    }
  }

  function handlePick(list: FileList | null) {
    setPhotoError(null);
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const room = MAX_PHOTOS - photoCount;
    if (incoming.length > room) {
      setPhotoError("answer.uploadTooMany");
    }
    const accepted: File[] = [];
    for (const file of incoming.slice(0, Math.max(0, room))) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setPhotoError("answer.unsupportedPhoto");
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError("answer.tooLargePhoto");
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSave() {
    if (!canSave || saving) return;
    const fd = new FormData();
    fd.append("intent", "save");
    fd.append("cardId", loaderData.cardId);
    if (loaderData.answerId) fd.append("answerId", loaderData.answerId);
    fd.append("text", text);
    fd.append("questionText", loaderData.question);
    if (loaderData.deckName) fd.append("deckName", loaderData.deckName);
    if (loaderData.categoryName) fd.append("categoryName", loaderData.categoryName);
    fd.append("month", loaderData.month);
    keptPhotos.forEach((key) => fd.append("keptPhotos", key));
    files.forEach((file) => fd.append("photos", file));
    fetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
  }

  // Filled slots: existing keys first, then freshly-picked files.
  type Slot =
    | { kind: "kept"; key: string; src: string }
    | { kind: "file"; src: string; index: number };
  const filledSlots: Slot[] = [
    ...keptPhotos.map((key) => ({
      kind: "kept" as const,
      key,
      src: `/api/files/${key}?width=400&height=400&fit=cover`,
    })),
    ...files.map((_, index) => ({ kind: "file" as const, src: previews[index], index })),
  ];
  const showAddSlot = photoCount < MAX_PHOTOS;

  return (
    <PhoneShell>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={(e) => handlePick(e.target.files)}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--df-outline-border)] text-foreground transition-colors duration-150 ease-standard hover:bg-[var(--df-surface-hover)] active:translate-y-px"
        >
          <LuX size={18} />
          <Text id="answer.close" as="span" className="sr-only" />
        </button>
        <Text
          id={loaderData.mode === "edit" ? "answer.editTitle" : "answer.newTitle"}
          as="span"
          className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[var(--df-text-label)]"
        />
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      {/* Question panel */}
      <div className="mt-6">
        <QuestionCard
          question={loaderData.question}
          deckLabel={loaderData.deckName ?? ""}
          categoryLabel={loaderData.categoryName ?? ""}
        />
      </div>

      {/* Answer text */}
      <div className="mt-7 grid gap-1.5">
        <Label htmlFor="answer-text" className="sr-only">
          <Text id="answer.writeLabel" as="span" />
        </Label>
        <div className="relative">
          <Textarea
            id="answer-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[170px] resize-none border-0 bg-transparent px-0 py-2 font-sans text-[18px] font-light leading-[1.6] text-foreground focus-visible:border-0 focus-visible:ring-0"
          />
          {text.length === 0 && (
            <Text
              id="answer.placeholder"
              as="span"
              className="pointer-events-none absolute left-0 top-2 font-sans text-[18px] font-light leading-[1.6] text-[var(--df-text-tertiary)]"
            />
          )}
        </div>
      </div>

      {/* Photos */}
      <div className="mt-8">
        <Text
          id="answer.photosLabel"
          as="p"
          vars={{ count: photoCount }}
          className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[var(--df-text-label)]"
        />
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {filledSlots.map((slot) => (
            <div
              key={slot.kind === "kept" ? slot.key : `file-${slot.index}`}
              className="relative aspect-square overflow-hidden rounded-[14px] border border-[var(--df-surface-border)] bg-[var(--df-surface)]"
            >
              <img
                src={slot.src}
                alt=""
                width={400}
                height={400}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  if (slot.kind === "kept") {
                    setKeptPhotos((prev) => prev.filter((k) => k !== slot.key));
                  } else {
                    setFiles((prev) => prev.filter((_, i) => i !== slot.index));
                  }
                }}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--df-burgundy-900)]/80 text-[var(--df-cream)] backdrop-blur-sm transition-colors duration-150 ease-standard hover:bg-[var(--df-burgundy-900)]"
              >
                <LuX size={14} />
                <Text id="answer.removePhoto" as="span" className="sr-only" />
              </button>
            </div>
          ))}

          {showAddSlot && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-[var(--df-outline-border)] bg-[var(--df-surface)] text-[var(--df-text-secondary)] transition-colors duration-150 ease-standard hover:bg-[var(--df-surface-hover)]"
            >
              <LuPlus size={20} />
              <Text
                id="answer.addPhoto"
                as="span"
                className="font-mono text-[10px] uppercase tracking-[.16em]"
              />
            </button>
          )}
        </div>
        <Text
          id="answer.photosHint"
          as="p"
          className="mt-2.5 text-[13px] leading-[1.45] text-[var(--df-text-tertiary)]"
        />
        {photoError && (
          <Text
            id={photoError}
            as="p"
            role="alert"
            className="mt-2 text-[13px] leading-[1.45] text-[color:var(--df-error-on-dark,#F2B8C6)]"
          />
        )}
      </div>

      {/* Save */}
      <div className="mt-9 flex flex-col items-center gap-3">
        <PrimaryButton
          size="lg"
          onClick={handleSave}
          disabled={!canSave || saving}
          className={cn("w-full", (!canSave || saving) && "opacity-60")}
        >
          <Text id={saving ? "answer.saving" : "common.save"} as="span" />
        </PrimaryButton>

        {saveFailed && !saving && (
          <Text
            id="answer.saveError"
            as="p"
            role="alert"
            className="text-[13px] leading-[1.45] text-[color:var(--df-error-on-dark,#F2B8C6)]"
          />
        )}

        {!canSave ? (
          <Text
            id="answer.emptyHelp"
            as="p"
            className="text-[13px] leading-[1.45] text-[var(--df-text-tertiary)]"
          />
        ) : (
          <p className="flex items-center gap-1.5 text-[13px] leading-[1.45] text-[var(--df-text-tertiary)]">
            <LuLock size={14} />
            <Text id="common.privateNote" as="span" />
          </p>
        )}
      </div>

      {/* Discard confirmation */}
      <Sheet open={discardOpen} onOpenChange={setDiscardOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[430px] gap-0 rounded-t-[28px] border-none bg-[var(--df-cream)] px-6 pb-10 pt-4 text-[var(--df-burgundy)]"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[var(--df-cream-300)]" />
          <SheetTitle
            className="font-display text-[30px] font-light leading-[1.1] text-[var(--df-burgundy)]"
            style={{ fontWeight: 300 }}
          >
            <Text id="answer.discardTitle" as="span" />
          </SheetTitle>
          <SheetDescription className="mt-2 text-[15px] leading-[1.6] text-[var(--df-burgundy-600)]">
            <Text id="answer.discardBody" as="span" />
          </SheetDescription>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setDiscardOpen(false)}
              className="h-12 rounded-full bg-[var(--df-burgundy)] font-sans text-[14px] font-medium uppercase tracking-[.04em] text-[var(--df-cream)] transition-colors duration-150 ease-standard hover:bg-[var(--df-burgundy-600)] active:translate-y-px"
            >
              <Text id="answer.keepGoing" as="span" />
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-12 rounded-full border border-[#9B2C2C] font-sans text-[14px] font-medium uppercase tracking-[.04em] text-[#9B2C2C] transition-colors duration-150 ease-standard hover:bg-[#9B2C2C]/10 active:translate-y-px"
            >
              <Text id="answer.discard" as="span" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </PhoneShell>
  );
}
