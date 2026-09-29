import { useState } from "react";
import { useFetcher } from "react-router";
import { eq } from "drizzle-orm";
import { LuLogOut, LuTrash2, LuCheck } from "react-icons/lu";
import type { Route } from "./+types/app.profile";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { AuthProvider } from "~stencil/ui/auth/context";
import { SignOutButton } from "~stencil/ui/auth/sign-out-button";
import { Text } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/ui/strings";
import { answers, monthlyNotes, settings } from "~/generated/db-schema";
import {
  PhoneShell,
  Eyebrow,
  DisplayTitle,
  StatTile,
  Toast,
} from "~/components/design";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

const BRAND_GRADIENT = "linear-gradient(160deg, #531832 0%, #8A365A 100%)";

const SEASONS: { key: StringKey; value: string }[] = [
  { key: "profile.season.change", value: "A season of change" },
  { key: "profile.season.rest", value: "A season of rest" },
  { key: "profile.season.growth", value: "A season of growth" },
  { key: "profile.season.grief", value: "A season of grief" },
  { key: "profile.season.beginnings", value: "A season of new beginnings" },
  { key: "profile.season.inBetween", value: "Somewhere in between" },
];

const TIMES: { key: StringKey; value: string }[] = [
  { key: "profile.time.morning", value: "07:30" },
  { key: "profile.time.midday", value: "12:30" },
  { key: "profile.time.evening", value: "20:00" },
  { key: "profile.time.night", value: "21:30" },
];

export function meta({}: Route.MetaArgs) {
  return [{ title: "Profile · Daily Few" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.createdBy, user.id))
    .limit(1);

  const answerRows = await db
    .select({ id: answers.id })
    .from(answers)
    .where(eq(answers.createdBy, user.id));

  return {
    user,
    displayName: row?.fullName ?? user.name ?? "",
    settings: {
      season: row?.season ?? "",
      dailyReminder: row?.dailyReminder ?? false,
      reminderTime: row?.reminderTime ?? "07:30",
      emailUpdates: row?.emailUpdates ?? false,
      textUpdates: row?.textUpdates ?? false,
    },
    reflectionsCount: answerRows.length,
    memberSince: new Date(
      (user as { createdAt?: string | Date }).createdAt ?? Date.now(),
    )
      .getUTCFullYear()
      .toString(),
  };
}

async function upsertSettings(
  db: ReturnType<typeof createDb>,
  userId: string,
  patch: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const [existing] = await db
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.createdBy, userId))
    .limit(1);
  if (existing) {
    await db
      .update(settings)
      .set({ ...patch, updatedAt: now })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      id: crypto.randomUUID(),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      ...patch,
    });
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const value = String(form.get("value") ?? "");

  try {
    switch (intent) {
      case "season":
        await upsertSettings(db, user.id, { season: value });
        break;
      case "daily":
        await upsertSettings(db, user.id, { dailyReminder: value === "true" });
        break;
      case "time":
        await upsertSettings(db, user.id, { reminderTime: value });
        break;
      case "email":
        await upsertSettings(db, user.id, { emailUpdates: value === "true" });
        break;
      case "text":
        await upsertSettings(db, user.id, { textUpdates: value === "true" });
        break;
      case "delete":
        await db.delete(answers).where(eq(answers.createdBy, user.id));
        await db.delete(monthlyNotes).where(eq(monthlyNotes.createdBy, user.id));
        return { ok: true as const, deleted: true as const };
      default:
        return { ok: false as const, error: "Unknown action" };
    }
    return { ok: true as const, deleted: false as const };
  } catch {
    return { ok: false as const, error: "Could not save" };
  }
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  return (
    <AuthProvider user={loaderData.user}>
      <PhoneShell nav="profile">
        <ProfileContent loaderData={loaderData} />
      </PhoneShell>
    </AuthProvider>
  );
}

function ProfileContent({ loaderData }: { loaderData: Route.ComponentProps["loaderData"] }) {
  const { user, displayName, settings: s, reflectionsCount, memberSince } = loaderData;

  const seasonFetcher = useFetcher<typeof action>();
  const dailyFetcher = useFetcher<typeof action>();
  const timeFetcher = useFetcher<typeof action>();
  const emailFetcher = useFetcher<typeof action>();
  const textFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();

  const [deleteOpen, setDeleteOpen] = useState(false);

  // Optimistic reads: prefer an in-flight submission, fall back to loader data.
  const season = (seasonFetcher.formData?.get("value") as string | null) ?? s.season;
  const daily =
    dailyFetcher.formData != null
      ? dailyFetcher.formData.get("value") === "true"
      : s.dailyReminder;
  const reminderTime =
    (timeFetcher.formData?.get("value") as string | null) ?? s.reminderTime;
  const email =
    emailFetcher.formData != null
      ? emailFetcher.formData.get("value") === "true"
      : s.emailUpdates;
  const text =
    textFetcher.formData != null
      ? textFetcher.formData.get("value") === "true"
      : s.textUpdates;

  const settingsFetchers = [seasonFetcher, dailyFetcher, timeFetcher, emailFetcher, textFetcher];
  const savedToast = settingsFetchers.some((f) => f.state === "idle" && f.data?.ok);
  const deletedToast = deleteFetcher.state === "idle" && deleteFetcher.data?.deleted === true;

  const submit = (fetcher: ReturnType<typeof useFetcher>, intent: string, value: string) =>
    fetcher.submit({ intent, value }, { method: "post" });

  const initial = (displayName || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-10">
      <Eyebrow>
        <Text id="profile.eyebrow" />
      </Eyebrow>

      {/* Header */}
      <header className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(209,219,255,.32)] font-display font-light text-[28px] text-[#FEFCF2]"
          style={{ background: BRAND_GRADIENT }}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="flex flex-col gap-1">
          <DisplayTitle className="text-[32px] leading-[1.06]">{displayName || "You"}</DisplayTitle>
          <p className="font-sans text-[13px] text-[rgba(254,252,242,.72)]">{user.email}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 pt-2">
          <StatTile value={reflectionsCount} label={<Text id="profile.reflectionsStat" />} />
          <StatTile value={memberSince} label={<Text id="profile.memberStat" />} />
        </div>
      </header>

      {/* Season of life */}
      <section className="flex flex-col gap-4">
        <DisplayTitle className="text-[25px] leading-[1.1]">
          <Text id="profile.seasonTitle" />
        </DisplayTitle>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map(({ key, value }) => {
            const selected = season === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => submit(seasonFetcher, "season", value)}
                aria-pressed={selected}
                className={cn(
                  "rounded-[4px] border px-4 py-2 font-sans text-[13px] transition-colors duration-150",
                  selected
                    ? "border-transparent bg-[#D1DBFF] text-[#280E1A]"
                    : "border-[rgba(254,252,242,.18)] bg-[rgba(254,252,242,.06)] text-[rgba(254,252,242,.72)] hover:bg-[rgba(254,252,242,.10)]",
                )}
              >
                <Text id={key} />
              </button>
            );
          })}
        </div>
        <p className="font-sans text-[12px] leading-[1.4] text-[rgba(254,252,242,.60)]">
          <Text id="profile.seasonCaption" />
        </p>
      </section>

      {/* Reminders and updates */}
      <section className="flex flex-col gap-2">
        <DisplayTitle className="text-[25px] leading-[1.1]">
          <Text id="profile.remindersTitle" />
        </DisplayTitle>

        <div className="flex flex-col divide-y divide-[rgba(254,252,242,.10)] rounded-2xl border border-[rgba(254,252,242,.14)] bg-[rgba(254,252,242,.04)] px-4">
          <SwitchRow
            labelId="profile.dailyReminderLabel"
            hintId="profile.dailyReminderHint"
            checked={daily}
            onChange={(v) => submit(dailyFetcher, "daily", String(v))}
          />
          {daily && (
            <div className="flex flex-col gap-2.5 py-4">
              <Eyebrow>
                <Text id="profile.reminderTimeLabel" />
              </Eyebrow>
              <div className="flex flex-wrap gap-2">
              {TIMES.map(({ key, value }) => {
                const selected = reminderTime === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => submit(timeFetcher, "time", value)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[.16em] transition-colors duration-150",
                      selected
                        ? "border-transparent bg-[#D1DBFF] text-[#280E1A]"
                        : "border-[rgba(254,252,242,.28)] text-[rgba(254,252,242,.66)] hover:bg-[rgba(254,252,242,.08)]",
                    )}
                  >
                    <Text id={key} />
                  </button>
                );
              })}
              </div>
            </div>
          )}
          <SwitchRow
            labelId="profile.emailLabel"
            hintId="profile.emailHint"
            checked={email}
            onChange={(v) => submit(emailFetcher, "email", String(v))}
          />
          <SwitchRow
            labelId="profile.textLabel"
            hintId="profile.textHint"
            checked={text}
            onChange={(v) => submit(textFetcher, "text", String(v))}
          />
        </div>
      </section>

      {/* Account */}
      <section className="flex flex-col gap-2">
        <DisplayTitle className="text-[25px] leading-[1.1]">
          <Text id="profile.accountTitle" />
        </DisplayTitle>

        <div className="flex flex-col divide-y divide-[rgba(254,252,242,.10)] rounded-2xl border border-[rgba(254,252,242,.14)] bg-[rgba(254,252,242,.04)]">
          <SignOutButton className="flex w-full items-center gap-3 px-4 py-4 text-left font-sans text-[15px] text-[#FEFCF2] transition-colors duration-150 hover:bg-[rgba(254,252,242,.08)]">
            <LuLogOut size={18} className="text-[rgba(254,252,242,.72)]" />
            <Text id="profile.signOut" />
          </SignOutButton>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-4 text-left font-sans text-[15px] text-[#F2B8C6] transition-colors duration-150 hover:bg-[rgba(254,252,242,.08)]"
          >
            <LuTrash2 size={18} />
            <Text id="profile.deleteAccount" />
          </button>
        </div>
      </section>

      {savedToast && !deletedToast && <Toast message={<Text id="profile.savedToast" />} />}
      {deletedToast && <Toast message={<Text id="profile.deletedToast" />} />}

      {/* Delete confirm sheet */}
      <Sheet open={deleteOpen} onOpenChange={setDeleteOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[430px] rounded-t-[28px] border-0 bg-[#FEFCF2] text-[#4C1C31]"
        >
          <SheetHeader className="border-b-0 pt-6">
            <SheetTitle className="font-display text-[30px] font-light leading-[1.1] text-[#4C1C31]">
              <Text id="profile.deleteTitle" />
            </SheetTitle>
            <SheetDescription className="font-sans text-[15px] leading-[1.6] text-[#6B2743]">
              <Text id="profile.deleteBody" />
            </SheetDescription>
          </SheetHeader>
          <SheetBody />
          <SheetFooter className="border-t-0 pb-10">
            <deleteFetcher.Form
              method="post"
              onSubmit={() => setDeleteOpen(false)}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="intent" value="delete" />
              <button
                type="submit"
                disabled={deleteFetcher.state !== "idle"}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#9B2C2C] font-sans text-[12px] font-medium uppercase tracking-[.04em] text-[#9B2C2C] transition-colors duration-150 hover:bg-[#9B2C2C] hover:text-[#FEFCF2] disabled:opacity-60"
              >
                <LuTrash2 size={16} />
                <Text id="profile.deleteConfirm" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="h-12 rounded-full font-sans text-[12px] font-medium uppercase tracking-[.04em] text-[#4C1C31] transition-colors duration-150 hover:bg-[rgba(76,28,49,.06)]"
              >
                <Text id="profile.deleteKeep" />
              </button>
            </deleteFetcher.Form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SwitchRow({
  labelId,
  hintId,
  checked,
  onChange,
}: {
  labelId: StringKey;
  hintId: StringKey;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex flex-col gap-0.5">
        <Text id={labelId} as="span" className="font-sans text-[15px] text-[#FEFCF2]" />
        <Text
          id={hintId}
          as="span"
          className="font-sans text-[12px] leading-[1.4] text-[rgba(254,252,242,.60)]"
        />
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-checked:bg-[#D1DBFF] data-unchecked:bg-[rgba(254,252,242,.14)]"
      />
    </div>
  );
}
