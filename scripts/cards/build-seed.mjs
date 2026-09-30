// Builds supabase/seed/cards.sql from the card library spreadsheet.
//
//   node scripts/cards/build-seed.mjs [path/to/Daily_Few_Card_Library.xlsx]
//
// The output is safe to run again after editing the spreadsheet: decks,
// categories and cards are updated in place, and any card or category that is no
// longer in the spreadsheet is archived (never deleted, so people's past answers
// keep pointing at it).
//
// "Card of the day" = Yes marks the cards that can be everyone's card of the
// day. Only monthly and library (Somewhere in Between) decks can use it.
//
// Card IDs are derived from deck + question text, so rewording a question in the
// spreadsheet creates a new card and archives the old one. Answers keep their
// original wording either way.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const input = resolve(process.argv[2] ?? `${root}/design/Daily_Few_Card_Library.xlsx`);
const output = `${root}/supabase/seed/cards.sql`;

// Seasons of life (PRD §4.12). Not in the spreadsheet; edit here.
const SEASONS = [
  ["starting-over", "Starting over", "A fresh chapter after something ended"],
  ["in-a-transition", "In a transition", "Between two versions of life"],
  ["healing-my-heart", "Healing my heart", "Heartbreak, a breakup, a friendship that ended"],
  ["grieving-something", "Grieving something", "Loss of a person, a plan, or who you used to be"],
  ["running-on-empty", "Running on empty", "Burnout, giving more than you have"],
  ["building-something", "Building something", "A career move, a business, a big goal"],
  ["falling-in-love", "Falling in love", "A new relationship, or opening up again"],
  ["becoming-a-mom", "Becoming a mom", "Pregnancy, new motherhood, or thinking about it"],
  ["figuring-it-out", "Figuring it out", "Unsure what's next"],
  ["just-checking-in", "Just checking in", "Nothing big going on"],
];

const DECK_TYPES = {
  "monthly or library": "library",
  monthly: "monthly",
  "life-season": "life_season",
  body: "body",
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december"];

const slug = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const uuidFrom = (s) => {
  const h = createHash("md5").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const sql = (v) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const text = (cell) => {
  const v = cell?.value;
  if (v == null) return "";
  if (typeof v === "object" && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("").trim();
  if (typeof v === "object" && "result" in v) return String(v.result ?? "").trim();
  return String(v).trim();
};

const rowsOf = (sheet) => {
  const header = sheet.getRow(1).values.slice(1).map((h) => String(h ?? "").trim().toLowerCase());
  const rows = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const obj = {};
    header.forEach((h, i) => (obj[h] = text(row.getCell(i + 1))));
    rows.push(obj);
  });
  return rows;
};

const book = new ExcelJS.Workbook();
await book.xlsx.readFile(input);
const deckRows = rowsOf(book.getWorksheet("Decks")).filter((r) => r["deck type"]);
const cardRows = rowsOf(book.getWorksheet("Cards")).filter((r) => r.deck && r.question);

const seasonByName = new Map(SEASONS.map(([id, name]) => [name.toLowerCase(), id]));
const errors = [];

const decks = deckRows.map((r, i) => {
  const type = DECK_TYPES[r["deck type"].toLowerCase()];
  if (!type) errors.push(`Deck "${r.deck}": unknown deck type "${r["deck type"]}"`);

  let name = r.deck;
  let month = null;
  const m = /^(.*)\((\w+)\s+(\d{4})\)\s*$/.exec(r.deck);
  if (type === "monthly") {
    const mi = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
    if (mi < 0) errors.push(`Monthly deck "${r.deck}" needs its month in the name, e.g. "Let It Fall (October 2026)"`);
    else {
      name = m[1].trim();
      month = `${m[3]}-${String(mi + 1).padStart(2, "0")}-01`;
    }
  }

  let seasonId = null;
  if (type === "life_season") {
    seasonId = seasonByName.get((r["linked season of life"] || "").toLowerCase()) ?? null;
    if (!seasonId) errors.push(`Life-season deck "${r.deck}": unknown season "${r["linked season of life"]}"`);
  }

  const seasonDescription = seasonId ? SEASONS.find(([id]) => id === seasonId)[2] : null;
  return {
    sheetName: r.deck,
    id: month ? `${slug(name)}-${month.slice(0, 7)}` : slug(name),
    name,
    description: r.description || seasonDescription,
    type,
    month,
    seasonId,
    min: Number(r["minimum cards"]) || 0,
    status: /^ready/i.test(r["ready to publish?"]) ? "published" : "draft",
    sort: i,
  };
});

const deckBySheetName = new Map(decks.map((d) => [d.sheetName, d]));
const categories = new Map();
const cards = [];

for (const r of cardRows) {
  const deck = deckBySheetName.get(r.deck);
  if (!deck) {
    errors.push(`Card "${r.question.slice(0, 40)}…" is in deck "${r.deck}", which isn't on the Decks tab`);
    continue;
  }
  if (!r.category) errors.push(`Card "${r.question.slice(0, 40)}…" has no category`);
  const catKey = `${deck.id}|${r.category}`;
  if (!categories.has(catKey)) {
    const order = [...categories.values()].filter((c) => c.deckId === deck.id).length;
    categories.set(catKey, { id: uuidFrom(`category|${catKey}`), deckId: deck.id, name: r.category, sort: order });
  }
  const id = uuidFrom(`card|${deck.id}|${r.question}`);
  if (cards.some((c) => c.id === id)) errors.push(`Duplicate question in "${r.deck}": ${r.question}`);
  cards.push({
    id,
    deckId: deck.id,
    categoryId: categories.get(catKey).id,
    question: r.question,
    sort: cards.filter((c) => c.deckId === deck.id).length,
    everyday: /^y/i.test(r["card of the day"] ?? ""),
  });
  if (/^y/i.test(r["card of the day"] ?? "") && deck.type !== "monthly" && deck.type !== "library") {
    errors.push(`Card "${r.question.slice(0, 40)}…": only monthly and library cards can be card of the day`);
  }
}

for (const d of decks) {
  const count = cards.filter((c) => c.deckId === d.id).length;
  if (d.status === "published" && count < d.min) {
    errors.push(`Deck "${d.name}" is marked ready but has ${count} cards (needs ${d.min})`);
  }
  if ((d.type === "monthly" || d.type === "library") && d.status === "published" && !cards.some((c) => c.deckId === d.id && c.everyday)) {
    errors.push(`Deck "${d.name}" has no cards marked "Card of the day"`);
  }
}

if (errors.length) {
  console.error(`Not written. Fix these in the spreadsheet first:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

const out = [];
out.push(`-- Generated by scripts/cards/build-seed.mjs from ${input.split(/[\\/]/).pop()}`);
out.push(`-- ${decks.length} decks, ${categories.size} categories, ${cards.length} cards. Do not edit by hand.`);
out.push("begin;", "");

out.push("insert into public.seasons (id, name, description, sort_order, archived) values");
out.push(SEASONS.map(([id, name, desc], i) => `  (${sql(id)}, ${sql(name)}, ${sql(desc)}, ${i}, false)`).join(",\n"));
out.push("on conflict (id) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, archived = false;", "");

out.push("insert into public.decks (id, name, description, type, month, season_id, status, sort_order) values");
out.push(decks.map((d) =>
  `  (${sql(d.id)}, ${sql(d.name)}, ${sql(d.description)}, ${sql(d.type)}, ${sql(d.month)}, ${sql(d.seasonId)}, ${sql(d.status)}, ${d.sort})`,
).join(",\n"));
out.push("on conflict (id) do update set name = excluded.name, description = excluded.description, type = excluded.type, month = excluded.month, season_id = excluded.season_id, status = excluded.status, sort_order = excluded.sort_order;", "");

out.push("insert into public.categories (id, deck_id, name, sort_order, archived) values");
out.push([...categories.values()].map((c) => `  (${sql(c.id)}, ${sql(c.deckId)}, ${sql(c.name)}, ${c.sort}, false)`).join(",\n"));
out.push("on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order, archived = false;", "");

out.push("insert into public.cards (id, deck_id, category_id, question, sort_order, everyday, archived) values");
out.push(cards.map((c) => `  (${sql(c.id)}, ${sql(c.deckId)}, ${sql(c.categoryId)}, ${sql(c.question)}, ${c.sort}, ${c.everyday}, false)`).join(",\n"));
out.push("on conflict (id) do update set deck_id = excluded.deck_id, category_id = excluded.category_id, question = excluded.question, sort_order = excluded.sort_order, everyday = excluded.everyday, archived = false;", "");

out.push("-- Anything no longer in the spreadsheet is archived, never deleted.");
out.push(`update public.cards set archived = true where not archived and id not in (${cards.map((c) => sql(c.id)).join(", ")});`);
out.push(`update public.categories set archived = true where not archived and id not in (${[...categories.values()].map((c) => sql(c.id)).join(", ")});`);
out.push(`update public.decks set status = 'archived' where id not in (${decks.map((d) => sql(d.id)).join(", ")});`);
out.push("", "commit;", "");

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, out.join("\n"));
console.log(`Wrote ${output}\n${decks.length} decks, ${categories.size} categories, ${cards.length} cards.`);
for (const d of decks) {
  console.log(`  ${d.status.padEnd(9)} ${d.type.padEnd(11)} ${d.name}${d.month ? ` (${d.month.slice(0, 7)})` : ""}: ${cards.filter((c) => c.deckId === d.id).length}`);
}
