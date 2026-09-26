import { useState } from "react";
import { redirect, Form, useNavigation } from "react-router";
import { eq } from "drizzle-orm";
import { LuMoon, LuCheck } from "react-icons/lu";
import type { Route } from "./+types/welcome";
import { createDb } from "~stencil/db";
import { requireAuth } from "~stencil/auth/server";
import { SignOutButton } from "~stencil/ui/auth/sign-out-button";
import { Text } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/ui/strings";
import { settings } from "~/generated/db-schema";
import { PhoneShell, Eyebrow, DisplayTitle, PrimaryButton } from "~/components/design";
import { cn } from "~/lib/utils";

const MIN_AGE = 18;

// Same six seasons as the Profile screen, so the stored value lines up.
const SEASONS: { key: StringKey; value: string }[] = [
  { key: "profile.season.change", value: "A season of change" },
  { key: "profile.season.rest", value: "A season of rest" },
  { key: "profile.season.growth", value: "A season of growth" },
  { key: "profile.season.grief", value: "A season of grief" },
  { key: "profile.season.beginnings", value: "A season of new beginnings" },
  { key: "profile.season.inBetween", value: "Somewhere in between" },
];

// Age from a "YYYY-MM-DD" string, computed in UTC so it never drifts by render.
function ageFrom(dob: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  let age = now.getUTCFullYear() - y;
  const nowMo = now.getUTCMonth() + 1;
  const nowD = now.getUTCDate();
  if (nowMo < mo || (nowMo === mo && nowD < d)) age -= 1;
  return age;
}

export function meta() {
  return [{ title: "Welcome · Daily Few" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.createdBy, user.id))
    .limit(1);

  // Already through onboarding → straight into the app.
  if (row?.onboardedAt) throw redirect("/app");

  // A recorded birthday under the age limit means they're gated out.
  const recordedAge = row?.birthday ? ageFrom(row.birthday, new Date()) : null;
  const blocked = recordedAge != null && recordedAge < MIN_AGE;

  return {
    email: user.email,
    name: row?.fullName ?? user.name ?? "",
    season: row?.season ?? "",
    phone: row?.phone ?? "",
    blocked,
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

  const fullName = String(form.get("fullName") ?? "").trim();
  const birthday = String(form.get("birthday") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const season = String(form.get("season") ?? "").trim();
  const consent = form.get("consent") === "on";

  if (!fullName) return { error: "onboarding.errorName" as StringKey };
  const age = birthday ? ageFrom(birthday, new Date()) : null;
  if (age == null) return { error: "onboarding.errorBirthday" as StringKey };
  if (!consent) return { error: "onboarding.errorConsent" as StringKey };

  const now = new Date().toISOString();
  const underage = age < MIN_AGE;

  try {
    await upsertSettings(db, user.id, {
      fullName,
      birthday,
      phone: phone || null,
      season: season || null,
      consentedAt: now,
      // Only adults are marked onboarded; a minor stays gated on every visit.
      onboardedAt: underage ? null : now,
    });
  } catch {
    return { error: "onboarding.errorGeneric" as StringKey };
  }

  if (underage) return { blocked: true as const };
  throw redirect("/app");
}

export default function Welcome({ loaderData, actionData }: Route.ComponentProps) {
  if (loaderData.blocked || (actionData && "blocked" in actionData && actionData.blocked)) {
    return <Gate />;
  }
  return <OnboardingForm loaderData={loaderData} actionData={actionData} />;
}

function Gate() {
  return (
    <PhoneShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--df-outline-border)] text-[var(--df-lilac)]">
          <LuMoon size={30} strokeWidth={1.4} />
        </span>
        <div className="flex flex-col gap-3">
          <Eyebrow className="self-center">
            <Text id="onboarding.gateEyebrow" />
          </Eyebrow>
          <DisplayTitle className="text-[34px] leading-[1.08]">
            <Text id="onboarding.gateTitle" />
          </DisplayTitle>
          <Text
            id="onboarding.gateBody"
            as="p"
            className="mx-auto max-w-[300px] font-sans text-[15px] leading-[1.6] text-[var(--df-text-secondary)]"
          />
        </div>
        <SignOutButton className="mt-2 rounded-full border border-[rgba(254,252,242,.40)] px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[.04em] text-foreground transition-colors duration-150 hover:bg-primary hover:text-primary-foreground">
          <Text id="onboarding.gateSignOut" />
        </SignOutButton>
      </div>
    </PhoneShell>
  );
}

const fieldLabel =
  "font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-[var(--df-text-label)]";
const textInput =
  "h-12 w-full rounded-2xl border border-[rgba(254,252,242,.16)] bg-[rgba(254,252,242,.04)] px-4 font-sans text-[15px] text-foreground placeholder:text-[var(--df-text-tertiary)] transition-colors duration-150 focus-visible:border-[var(--df-lilac)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

function OnboardingForm({
  loaderData,
  actionData,
}: {
  loaderData: Route.ComponentProps["loaderData"];
  actionData: Route.ComponentProps["actionData"];
}) {
  const navigation = useNavigation();
  const submitting = navigation.state !== "idle";
  const error = actionData && "error" in actionData ? actionData.error : null;

  const [season, setSeason] = useState(loaderData.season);

  return (
    <PhoneShell>
      <div className="flex items-center gap-2">
        <img
          src="/assets/submark-white.png"
          alt="Daily Few"
          width={28}
          height={28}
          className="h-7 w-7 opacity-90"
        />
        <Eyebrow>
          <Text id="onboarding.eyebrow" />
        </Eyebrow>
      </div>

      <header className="mt-6 flex flex-col gap-3">
        <DisplayTitle className="text-[36px] leading-[1.06] font-light">
          <Text id="onboarding.title" />
        </DisplayTitle>
        <Text
          id="onboarding.subtitle"
          as="p"
          className="font-sans text-[15px] leading-[1.6] text-[var(--df-text-secondary)]"
        />
      </header>

      <Form method="post" className="mt-9 flex flex-col gap-6">
        {/* Name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="fullName" className={fieldLabel}>
            <Text id="onboarding.nameLabel" as="span" />
          </label>
          <Text id="onboarding.namePlaceholder" as="span" className="sr-only" />
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            defaultValue={loaderData.name}
            placeholder="What should we call you?"
            className={textInput}
          />
        </div>

        {/* Email (read-only, from the account) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={fieldLabel}>
            <Text id="onboarding.emailLabel" as="span" />
          </label>
          <input
            id="email"
            type="email"
            value={loaderData.email}
            readOnly
            disabled
            className={cn(textInput, "cursor-not-allowed text-[var(--df-text-secondary)] opacity-80")}
          />
          <Text
            id="onboarding.emailHint"
            as="p"
            className="font-sans text-[12px] leading-[1.4] text-[var(--df-text-tertiary)]"
          />
        </div>

        {/* Birthday */}
        <div className="flex flex-col gap-2">
          <label htmlFor="birthday" className={fieldLabel}>
            <Text id="onboarding.birthdayLabel" as="span" />
          </label>
          <input
            id="birthday"
            name="birthday"
            type="date"
            className={cn(textInput, "[color-scheme:dark]")}
          />
          <Text
            id="onboarding.birthdayHint"
            as="p"
            className="font-sans text-[12px] leading-[1.4] text-[var(--df-text-tertiary)]"
          />
        </div>

        {/* Phone (optional) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="phone" className={fieldLabel}>
              <Text id="onboarding.phoneLabel" as="span" />
            </label>
            <span className="rounded-full border border-[rgba(254,252,242,.20)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.16em] text-[var(--df-text-tertiary)]">
              <Text id="onboarding.phoneOptional" as="span" />
            </span>
          </div>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={loaderData.phone}
            placeholder="For text reminders, if you'd like them"
            className={textInput}
          />
        </div>

        {/* Season */}
        <div className="flex flex-col gap-3">
          <span className={fieldLabel}>
            <Text id="onboarding.seasonLabel" as="span" />
          </span>
          <input type="hidden" name="season" value={season} />
          <div className="flex flex-wrap gap-2">
            {SEASONS.map(({ key, value }) => {
              const selected = season === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeason(selected ? "" : value)}
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
          <Text
            id="onboarding.seasonHint"
            as="p"
            className="font-sans text-[12px] leading-[1.4] text-[var(--df-text-tertiary)]"
          />
        </div>

        {/* Consent */}
        <label
          htmlFor="consent"
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[rgba(254,252,242,.14)] bg-[rgba(254,252,242,.04)] p-4"
        >
          <span className="relative mt-0.5 flex h-5 w-5 flex-none items-center justify-center">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              className="peer h-5 w-5 flex-none appearance-none rounded-[6px] border border-[rgba(254,252,242,.32)] bg-transparent transition-colors duration-150 checked:border-transparent checked:bg-[#D1DBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <LuCheck
              size={13}
              strokeWidth={3}
              className="pointer-events-none absolute text-[#280E1A] opacity-0 peer-checked:opacity-100"
            />
          </span>
          <Text
            id="onboarding.consent"
            as="span"
            className="font-sans text-[13px] leading-[1.5] text-[rgba(254,252,242,.82)]"
          />
        </label>

        {error && (
          <Text
            id={error}
            as="p"
            role="alert"
            className="text-[13px] leading-[1.45] text-[color:var(--df-error-on-dark,#F2B8C6)]"
          />
        )}

        <PrimaryButton size="lg" type="submit" disabled={submitting} className="mt-1">
          <Text id={submitting ? "onboarding.saving" : "onboarding.submit"} as="span" />
        </PrimaryButton>
      </Form>
    </PhoneShell>
  );
}
