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

## Updating the questions

1. Edit `design/Daily_Few_Card_Library.xlsx` (Decks and Cards tabs).
2. Run `node scripts/cards/build-seed.mjs`. It checks minimum card counts and refuses to write if something's wrong.
3. Paste `supabase/seed/cards.sql` into the Supabase SQL editor and run it.

Cards removed from the spreadsheet are archived, never deleted, so people's past answers stay intact.
Rewording a question creates a new card; answers keep the wording they were written against.
