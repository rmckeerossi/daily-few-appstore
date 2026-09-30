# Daily Few

A private reflection app for iPhone. Pull a question card from a themed deck,
answer it privately in writing, voice or photos, and look back month by month.

- Product spec: [design/PRD.md](design/PRD.md)
- Visual spec: [design/LAYOUT.md](design/LAYOUT.md), tokens in [design/tokens](design/tokens), screens in [design/screens](design/screens)
- Question library: [design/Daily_Few_Card_Library.xlsx](design/Daily_Few_Card_Library.xlsx)
- `reference/stencil-web/` is the earlier Stencil-built web version, kept only for reference. It is not part of the app.

## How it's built

- **App:** Expo (React Native) with Expo Router. Screens are in `src/app/`, shared UI in `src/components/`, data access in `src/lib/`.
- **Backend:** Supabase (accounts, database, private file storage). The schema, privacy rules and storage rules are in `supabase/migrations/`.
- **Sign-in:** a one-time code sent by email. No passwords.
- **Privacy:** every answer, note and file is readable only by the person who wrote it, enforced by the database's Row Level Security, not by the app.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with your iPhone camera to open the app in Expo Go.

## Admin reports

In Supabase, open **Table Editor**, switch the schema dropdown (top left) from `public` to `admin`, and pick a report. Each one can be downloaded with **Export → CSV**.

| Report | What it shows |
|---|---|
| `summary` | Headline numbers: total users, signups (7/30 days), active users, shared-link signups, opt-ins |
| `users` | The user list and export: name, email, birthday, phone, season, signup date, shared-link signup, email and text consent |
| `signups_by_day` | New signups per day, and how many came from shared links |
| `activity_by_day` | Daily active users, cards answered, skipped and shared, % who answered card of the day |
| `active_by_month` | Monthly active users |
| `card_stats` | Every card: drawn, answered, skipped, shared (sort to find most answered or most skipped) |
| `deck_stats` | Every deck: active cards, drawn, answered, skipped |
| `monthly_deck_calendar` | The next 12 months and which have a monthly deck, so gaps show early |

These are counts and signup details only. None of them read what anyone wrote, recorded or photographed.

## Updating the short reads

1. Edit or add a file in `content/reads/` (one `.md` file per read; the header at the top sets its title, topic (which shelf it sits on in the Library), reading time, which decks show it as "Read first", which recap patterns link to it, and whether the clinical advisor has reviewed it).
2. Run `node scripts/reads/build-seed.mjs`.
3. Paste `supabase/seed/reads.sql` into the Supabase SQL editor and run it.

## Updating the questions

1. Edit `design/Daily_Few_Card_Library.xlsx` (Decks and Cards tabs). Mark "Yes" in the Cards tab's "Card of the day" column for questions anyone could answer; card of the day only picks those, from the monthly deck and Somewhere in Between. Questions set aside for future monthly decks live on the "Saved for later" tab, which the app doesn't load.
2. Run `node scripts/cards/build-seed.mjs`. It checks minimum card counts and refuses to write if something's wrong.
3. Paste `supabase/seed/cards.sql` into the Supabase SQL editor and run it.

Cards removed from the spreadsheet are archived, never deleted, so people's past answers stay intact.
Rewording a question creates a new card; answers keep the wording they were written against.
